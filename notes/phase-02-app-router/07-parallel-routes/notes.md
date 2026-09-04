# Parallel Routes `@slot`

> **Live demo:** `npm run dev` → [/playground/phase-02-app-router/07-parallel-routes](http://localhost:3000/playground/phase-02-app-router/07-parallel-routes)

## Quick Reference

| Fact | Detail |
|---|---|
| Syntax | `@slotName` folder — e.g. `@team`, `@analytics` |
| Rendered as | A named prop on the parent `layout.tsx`, **not** `children` |
| URL effect | None — like route groups, the `@slot` segment never appears in the URL |
| Simultaneity | All slots (and `children`, from the unmarked `page.tsx`) render at once, each independently streamable |
| `default.tsx` | **Mandatory** for every named slot (`@team`, `@analytics`, etc.) — a missing one is now an error requiring a fix, not a silent fallback |
| `children` slot | Implicit — `app/page.tsx` is equivalent to `app/@children/page.tsx` — and needs its own `default.tsx` too, though a missing one there still just 404s rather than erroring |

## Where Does This Run?

Server, same as any route segment — but the defining trait is architectural: each slot is an independent rendering unit with its own loading/error boundaries, not a runtime-only concept.

## What Is This?

A folder named with an `@` prefix — `@team`, `@analytics` — defines a **parallel route slot**: a section of UI that renders simultaneously alongside `children` and any other slots at that layout level, each one an independently addressable route in its own right. The parent `layout.tsx` receives every slot as a named prop matching the folder name.

> **Check yourself:** If `app/dashboard/@analytics/page.tsx` exists, what prop name does `app/dashboard/layout.tsx` receive it under?

## Why Does It Exist?

A layout's `children` prop is a single slot — at any given URL, exactly one thing renders there. That's insufficient for a dashboard where, say, a `@team` panel and an `@analytics` panel both need to render at once, each fetching its own data independently, each with its own loading state while the other has already resolved, and each potentially navigable somewhat independently. Without parallel routes, you'd have to fetch all of that data in one place and manually split up loading/error states in JSX yourself, losing the per-segment streaming and error-isolation the App Router otherwise gives you for free. Parallel routes exist to extend "independent, streamable segment" (Topic 1's core idea) from one slot per layout to many.

## How It Works

```
app/dashboard/
  layout.tsx        ← receives { children, team, analytics } as props
  page.tsx           → becomes the "children" prop
  @team/
    page.tsx          → becomes the "team" prop
    default.tsx
  @analytics/
    page.tsx          → becomes the "analytics" prop
    default.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div className="grid grid-cols-2">
        {team}
        {analytics}
      </div>
    </>
  );
}
```

Each slot behaves like its own mini route: it can have its own `loading.tsx` and `error.tsx`, so a slow `@analytics` query shows its own loading state without blocking `@team` from rendering, and a failure inside `@analytics` doesn't take down `@team` or the rest of the layout — error isolation and independent streaming, per slot. Because `LayoutProps<Route>` (Phase 1 Topic 5; Topic 2) infers a typed prop for every slot folder actually present, adding `@analytics` to the tree above would make `analytics` show up on `DashboardLayout`'s props automatically, without hand-editing the type.

**`default.tsx` exists to answer a specific edge case, and current Next.js treats it as mandatory, not optional.** On a hard navigation or full page load, Next.js needs to know what to render in a slot whose active state can't be derived from the current URL (because the URL only reflects the page you actually navigated to, not every slot's state). For a **named** slot (`@team`, `@analytics`), if `default.tsx` is missing, Next.js now returns an error and requires you to add one before the route will render at all — this is a genuine, enforced requirement, not a graceful fallback you can skip. If you specifically want the *old* behavior (a quiet 404 in that region instead of a hard error), you write that yourself:

```tsx
// app/dashboard/@analytics/default.tsx
import { notFound } from 'next/navigation';

export default function Default() {
  notFound();
}
```

The **implicit `children` slot is the one exception to the hard-error rule**: since `app/page.tsx` is really `app/@children/page.tsx` under the hood, it also needs a `default.tsx` for cases where Next.js can't recover the parent page's active state — but if you skip it, the behavior is still just a 404 for that route, not a build/render error the way a missing named-slot `default.tsx` is.

> **Check yourself:** For a named slot like `@analytics`, what's the actual current-Next.js consequence of never adding a `default.tsx` at all — not what it degrades to, but what happens?

## Gotchas

- **Forgetting `default.tsx` for a named slot** is the single most common parallel-routes bug — everything works fine during normal client-side navigation, then a refresh on a specific URL produces a hard error for that route rather than a graceful fallback.
- **`@slot` never appears in the URL**, exactly like a route group's parenthesized folder — it's easy to conflate the two conventions, but they solve different problems: route groups scope layouts without adding a URL segment; parallel routes render multiple independent segments simultaneously.
- **Slots are matched independently of each other.** Navigating a link that only targets `children` (the main `page.tsx`) doesn't necessarily change what's rendered in `@team` or `@analytics` — each slot keeps its own last-matched state unless something explicitly navigates it too, which is exactly the mechanism intercepting routes (Topic 8) build on for modals.
- **All slots at a given segment must share the same rendering mode.** If one slot needs dynamic rendering (Phase 3), every slot at that same level is forced into dynamic rendering too — you can't have one slot statically prerendered while its sibling slot is dynamic at the same segment.

## Interview Questions

**Q (High): What are parallel routes, and what problem do they solve that a single `children` prop can't?**

Answer: Parallel routes let a layout render multiple independent route segments simultaneously, each exposed as its own named prop (`@team` → `team`) rather than everything competing for the single `children` slot. This gives each section its own independent data fetching, its own `loading.tsx`/`error.tsx` boundary, and its own streaming behavior — a slow or failing section doesn't block or crash the others, which a single-slot layout manually splitting up JSX and Suspense boundaries by hand couldn't achieve as cleanly.

The trap: describing parallel routes as just "rendering multiple components in a layout," missing that the real value is *independent* per-segment loading/error/streaming behavior, not merely visual composition.

**Q (High): What is `default.tsx` for in the context of parallel routes, and what happens without it?**

Answer: It's the fallback Next.js renders for a slot when the current URL doesn't provide enough information to determine what that slot should show — most commonly on a hard navigation or full page reload, where only the "children" route is actually reflected in the URL. For a named slot (`@team`, `@analytics`), a missing `default.tsx` is now a hard error that blocks the route from rendering at all — it's a required file, not an optional nicety. For the implicit `children` slot specifically, a missing `default.tsx` still just produces a 404 rather than a hard error. If you want the old, gentler "just 404 this region" behavior for a named slot, you have to opt into it explicitly by writing a `default.tsx` that calls `notFound()`.

The trap: not knowing this file exists at all; assuming it's merely recommended rather than required for named slots; or conflating the named-slot behavior (hard error) with the `children`-slot behavior (still just a 404) as if they were the same.

**Q (Medium): How does a layout receive parallel route slots as props — what's the naming convention?**

Answer: Each `@slotName` folder is passed to the parent `layout.tsx` as a prop named exactly `slotName` (without the `@`) — `@analytics/page.tsx` becomes the `analytics` prop. The unmarked `page.tsx` directly in the layout's folder is passed as `children`, same as always.

The trap: assuming slots are passed as a single collection/array prop rather than individually named props matching each folder.

**Q (Medium): Do parallel route slots (`@folder`) show up in the URL?**

Answer: No — like a parenthesized route group, the `@slot` segment is purely a file-organization and prop-naming convention and never appears in the resulting URL.

The trap: confusing this with a dynamic segment, or assuming any bracket/at-sign convention necessarily shows up in the path.

**Q (Low): Name a real UI pattern that requires parallel routes.**

Answer: A dashboard with independently-loading panels (analytics, team activity, notifications) each needing its own loading/error state; role-based conditional UI where different content renders in the same layout region depending on auth state; or, combined with intercepting routes (Topic 8), a modal that overlays the current page while the underlying content stays mounted and interactive.

The trap: describing a use case that's really just "multiple components on a page," without identifying why it specifically needs independent per-segment streaming/error handling rather than ordinary component composition.

**Q (Medium): Can one parallel route slot be statically rendered while a sibling slot at the same segment is dynamically rendered?**

Answer: No — all slots at a given segment level are forced to share the same rendering mode. If any one slot needs dynamic rendering (Phase 3), every other slot at that same level is dynamically rendered too, even if that sibling slot's own content had no dynamic dependency of its own.

The trap: assuming each slot's rendering mode is fully independent just because its data fetching and error/loading boundaries are — rendering mode is a segment-level property, not a per-slot one.

---

## Self-Assessment

- [ ] Can state the exact prop-naming rule for how a layout receives a parallel route slot
- [ ] Can explain what `default.tsx` is for, and correctly distinguish the named-slot (hard error) vs. `children`-slot (still just 404) consequence of skipping it
- [ ] Knows `children` is itself an implicit slot, equivalent to `@children`
- [ ] Can articulate why parallel routes give error/loading isolation that manual JSX composition wouldn't
- [ ] Knows `@slot` segments never appear in the URL
- [ ] Knows all slots at one segment share a single rendering mode — one dynamic slot forces all of them dynamic
- [ ] Can name at least one real use case beyond "render two things at once"

---
*Next: Intercepting routes `(.)/(..)/(...)` — a convention built directly on top of parallel routes, letting a navigation show a route in a different context (like a modal) while the underlying page stays mounted, without losing a real, shareable URL.*
