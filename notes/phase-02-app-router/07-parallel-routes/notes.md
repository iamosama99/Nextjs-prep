# Parallel Routes `@slot`

## Quick Reference

| Fact | Detail |
|---|---|
| Syntax | `@slotName` folder — e.g. `@team`, `@analytics` |
| Rendered as | A named prop on the parent `layout.tsx`, **not** `children` |
| URL effect | None — like route groups, the `@slot` segment never appears in the URL |
| Simultaneity | All slots (and `children`, from the unmarked `page.tsx`) render at once, each independently streamable |
| `default.tsx` | Required fallback per slot for when the current URL doesn't resolve a value for that slot (e.g. on hard navigation) |

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

Each slot behaves like its own mini route: it can have its own `loading.tsx` and `error.tsx`, so a slow `@analytics` query shows its own loading state without blocking `@team` from rendering, and a failure inside `@analytics` doesn't take down `@team` or the rest of the layout — error isolation and independent streaming, per slot.

**`default.tsx` exists to answer a specific edge case:** on a hard navigation or full page load, Next.js needs to know what to render in a slot whose active state can't be derived from the current URL (because the URL only reflects the page you actually navigated to, not every slot's state). Without a `default.tsx` for a slot, an unmatched slot renders a 404 for that region specifically — not the whole page — on a full reload. Providing `default.tsx` (often just re-rendering the slot's own `page.tsx`, or a sensible empty state) avoids that.

> **Check yourself:** Why does an unmatched parallel route slot risk showing a 404 specifically on a hard reload, but not necessarily during in-app client-side navigation?

## Gotchas

- **Forgetting `default.tsx`** is the single most common parallel-routes bug — everything works fine during normal client-side navigation, then a refresh on a specific URL produces an unexpected 404 in one region of the page.
- **`@slot` never appears in the URL**, exactly like a route group's parenthesized folder — it's easy to conflate the two conventions, but they solve different problems: route groups scope layouts without adding a URL segment; parallel routes render multiple independent segments simultaneously.
- **Slots are matched independently of each other.** Navigating a link that only targets `children` (the main `page.tsx`) doesn't necessarily change what's rendered in `@team` or `@analytics` — each slot keeps its own last-matched state unless something explicitly navigates it too, which is exactly the mechanism intercepting routes (Topic 8) build on for modals.

## Interview Questions

**Q (High): What are parallel routes, and what problem do they solve that a single `children` prop can't?**

Answer: Parallel routes let a layout render multiple independent route segments simultaneously, each exposed as its own named prop (`@team` → `team`) rather than everything competing for the single `children` slot. This gives each section its own independent data fetching, its own `loading.tsx`/`error.tsx` boundary, and its own streaming behavior — a slow or failing section doesn't block or crash the others, which a single-slot layout manually splitting up JSX and Suspense boundaries by hand couldn't achieve as cleanly.

The trap: describing parallel routes as just "rendering multiple components in a layout," missing that the real value is *independent* per-segment loading/error/streaming behavior, not merely visual composition.

**Q (High): What is `default.tsx` for in the context of parallel routes, and what happens without it?**

Answer: It's the fallback Next.js renders for a slot when the current URL doesn't provide enough information to determine what that slot should show — most commonly on a hard navigation or full page reload, where only the "children" route is actually reflected in the URL. Without a `default.tsx`, an unmatched slot renders a 404 for that specific region of the page rather than falling back gracefully.

The trap: not knowing this file exists at all, or assuming the slot will simply keep showing whatever it last showed — that persistence only holds during client-side navigation, not across a full reload.

**Q (Medium): How does a layout receive parallel route slots as props — what's the naming convention?**

Answer: Each `@slotName` folder is passed to the parent `layout.tsx` as a prop named exactly `slotName` (without the `@`) — `@analytics/page.tsx` becomes the `analytics` prop. The unmarked `page.tsx` directly in the layout's folder is passed as `children`, same as always.

The trap: assuming slots are passed as a single collection/array prop rather than individually named props matching each folder.

**Q (Medium): Do parallel route slots (`@folder`) show up in the URL?**

Answer: No — like a parenthesized route group, the `@slot` segment is purely a file-organization and prop-naming convention and never appears in the resulting URL.

The trap: confusing this with a dynamic segment, or assuming any bracket/at-sign convention necessarily shows up in the path.

**Q (Low): Name a real UI pattern that requires parallel routes.**

Answer: A dashboard with independently-loading panels (analytics, team activity, notifications) each needing its own loading/error state; role-based conditional UI where different content renders in the same layout region depending on auth state; or, combined with intercepting routes (Topic 8), a modal that overlays the current page while the underlying content stays mounted and interactive.

The trap: describing a use case that's really just "multiple components on a page," without identifying why it specifically needs independent per-segment streaming/error handling rather than ordinary component composition.

---

## Self-Assessment

- [ ] Can state the exact prop-naming rule for how a layout receives a parallel route slot
- [ ] Can explain what `default.tsx` is for and describe the failure mode without it
- [ ] Can articulate why parallel routes give error/loading isolation that manual JSX composition wouldn't
- [ ] Knows `@slot` segments never appear in the URL
- [ ] Can name at least one real use case beyond "render two things at once"

---
*Next: Intercepting routes `(.)/(..)/(...)` — a convention built directly on top of parallel routes, letting a navigation show a route in a different context (like a modal) while the underlying page stays mounted, without losing a real, shareable URL.*
