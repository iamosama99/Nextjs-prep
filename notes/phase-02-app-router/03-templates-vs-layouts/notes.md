# Templates vs Layouts

## Quick Reference

| | `layout.tsx` | `template.tsx` |
|---|---|---|
| Same folder-nesting rules | Yes | Yes |
| Component instance across navigation | **Persists** (Topic 2) | **Recreated** on every navigation |
| Local state on navigation | Survives | Resets |
| `useEffect` on navigation | Doesn't re-run (already mounted) | Re-runs (fresh mount) |
| Typical use | Persistent shells (sidebar, nav) | Per-navigation resets (enter/exit animation, per-view analytics) |

## Where Does This Run?

Same as layouts — server by default, with the remount-vs-persist behavior itself being a client-side navigation concern.

## What Is This?

`template.tsx` follows the exact same nesting and prop conventions as `layout.tsx` — but where a layout deliberately stays mounted across navigations within it, a template deliberately does the opposite: Next.js creates a **new instance** of everything below a template on every navigation, even between sibling routes that would otherwise share it.

> **Check yourself:** If `app/dashboard/template.tsx` exists instead of `layout.tsx`, and a user navigates from `/dashboard/settings` to `/dashboard/billing`, does any state inside the template survive?

## Why Does It Exist?

Layout persistence (Topic 2) is usually exactly what you want — but it's actively wrong for UI that needs to genuinely reset on every navigation: a per-page enter/exit CSS animation needs a fresh DOM node to trigger on mount; a `useEffect` that logs a page view needs to actually re-run each time, not stay dormant because the component never remounted; a form that should always start blank when its route is revisited needs its local state discarded rather than preserved. Templates exist because these are legitimate, common needs that layout's persistence guarantee structurally cannot satisfy.

## How It Works

Templates compose with layouts rather than replacing them — a route segment can have both:

```
app/
  dashboard/
    layout.tsx      ← persists (e.g. sidebar, nav — stays mounted)
    template.tsx     ← remounts on every navigation (e.g. page transition wrapper)
      settings/
        page.tsx
```

Render order wraps outside-in: `layout.tsx` → `template.tsx` → `page.tsx`. The layout's persistent shell stays put; the template (and everything inside it, including the page) gets torn down and recreated fresh on every navigation, even if the destination route also renders the exact same `template.tsx` file.

```tsx
// app/dashboard/template.tsx
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // this genuinely re-runs on every navigation within /dashboard, unlike inside a layout
    trackPageView();
  }, []);

  return <div className="page-transition">{children}</div>;
}
```

> **Check yourself:** Why would putting the `trackPageView()` call above inside `layout.tsx` instead of `template.tsx` silently break analytics for in-section navigation?

## Gotchas

- **Reaching for `template.tsx` by default** defeats one of App Router's main advantages — state and mount persistence — for no reason. It should be a deliberate opt-out for a specific piece of UI, not a habit.
- **Nesting order matters and is easy to get backwards** — a template *inside* a persistent layout resets on navigation while the layout around it doesn't; mixing these up produces either UI that resets when it shouldn't, or UI that stays stuck when it should have refreshed.
- **The root layout can't be swapped for a template.** The root segment (`app/layout.tsx`) is required and must remain a layout — templates apply to nested segments, not as a replacement for the mandatory root shell.

## Interview Questions

**Q (High): What's the actual behavioral difference between `template.tsx` and `layout.tsx`?**

Answer: Both follow identical file-nesting conventions and both wrap `children`, but a layout's component instance persists across navigations within it — state and effects are preserved — while a template's instance is recreated fresh on every single navigation, even between sibling routes, causing local state to reset and mount-time effects (`useEffect` with an empty dependency array) to re-run each time.

The trap: describing them as "basically the same file with a different name," missing that the persist-vs-remount distinction is the entire reason the second convention exists.

**Q (High): Give a concrete case where you'd need `template.tsx` instead of `layout.tsx`.**

Answer: A page-enter/exit CSS or animation-library transition that needs a genuinely fresh DOM node to trigger correctly on every navigation; or a `useEffect`-based per-page-view analytics call that must fire on every visit to a route, which would silently stop firing for in-section navigation if placed in a persistent layout instead.

The trap: a vague answer like "for animations" with no explanation of *why* layout's persistence specifically breaks that use case.

**Q (Medium): Can you nest a template inside a layout inside another layout? What's the render order?**

Answer: Yes — layouts and templates compose freely by folder nesting, outermost to innermost: outer layouts wrap inner layouts, which wrap a template if present, which wraps the page. Only the template (and everything inside it) remounts on navigation; the layouts around it persist as usual.

The trap: assuming a template "converts" everything below it in the entire tree into layout-like persistent behavior, or vice versa — each file's behavior applies only to itself and what's directly nested under it, not to ancestors.

**Q (Low): Does `template.tsx` at the root level need to render `<html>`/`<body>` the way the root `layout.tsx` does?**

Answer: No — the root layout (`app/layout.tsx`) is the one required file responsible for `<html>`/`<body>`, and that responsibility can't be handed to a template; a root-level `template.tsx`, if present, would sit inside the root layout's `<body>`, not replace it.

The trap: assuming any root-level special file inherits the document-shell responsibility — only the root layout does.

---

## Self-Assessment

- [ ] Can state the persist-vs-remount distinction between layout and template without notes
- [ ] Can name a concrete UI pattern that requires a template instead of a layout, and explain why
- [ ] Can correctly order layout → template → page when both exist at the same segment
- [ ] Knows the root layout's `<html>`/`<body>` responsibility can't move to a template
- [ ] Would treat reaching for `template.tsx` as a deliberate choice, not a default

---
*Next: Route groups `(folder)` for organization — a folder-naming convention that changes how routes are organized and laid out without ever appearing in the URL itself.*
