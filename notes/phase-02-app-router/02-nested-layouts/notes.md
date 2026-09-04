# Root Layout & Nested Layouts

## Quick Reference

| Fact | Detail |
|---|---|
| Root layout | `app/layout.tsx` — required, must render `<html>`/`<body>` (Phase 1, Topic 2) |
| Nesting | Any folder can have its own `layout.tsx`, wrapping everything below it |
| Persistence | A shared layout does **not** remount when navigating between routes that both use it |
| Props received | `children`, and `params` for its own segment — **not** `searchParams` or pathname |
| Typed props | `LayoutProps<'/dashboard'>` — globally available helper, also auto-types any parallel-route slots (Topic 7) |
| Data fetching | Each layout can independently be an `async` Server Component and fetch its own data |

## Where Does This Run?

Server by default, like any Server Component (Phase 4) — but the persistence behavior described below is really a **client-side navigation** concern: it's about which parts of the already-rendered component tree the router keeps mounted versus recreates when the URL changes.

## What Is This?

A `layout.tsx` file wraps `page.tsx` and any nested routes below it in the folder tree. Layouts nest exactly the way folders nest: `app/layout.tsx` wraps everything in the app; `app/dashboard/layout.tsx` wraps everything under `app/dashboard/`; a page three folders deep is wrapped by every layout above it, outermost first.

> **Check yourself:** For the route `/dashboard/settings/profile`, if `layout.tsx` files exist at `app/`, `app/dashboard/`, and `app/dashboard/settings/`, in what order do they wrap the final page — outermost to innermost?

## Why Does It Exist?

Pages Router had one shared wrapper (`_app.tsx`) for the entire application — there was no concept of a layout scoped to *part* of the route tree, and critically, navigating between any two pages meant `_app` re-ran its render logic uniformly; preserving state scoped to a section of the app (an open sidebar, a scroll position, an in-progress multi-tab form) required manual workarounds. Nested layouts solve this structurally: a layout scoped to `/dashboard/*` can hold its own component state — a collapsed/expanded sidebar, for instance — and that state survives navigating between `/dashboard/settings` and `/dashboard/billing`, because the layout instance is never torn down; only the inner `page.tsx` content swaps out underneath it.

## How It Works

**Persistence is the core mechanical fact to internalize.** When you navigate from `/dashboard/settings` to `/dashboard/billing`, both routes share `app/dashboard/layout.tsx`. Next.js's router recognizes that the shared layout segment hasn't changed and does **not** remount it — its component instance, local state (`useState`, open `<details>` elements, scroll position within it), and any effects it set up all survive untouched. Only the divergent part of the tree — in this case, `page.tsx` — actually swaps.

```
app/
  dashboard/
    layout.tsx          ← stays mounted across /dashboard/* navigation
      settings/
        page.tsx         ← swaps out
      billing/
        page.tsx         ← swaps in
```

This is a deliberate, load-bearing design decision, not an implementation detail — it's *why* App Router can offer things like a persistent sidebar or persistent audio player that Pages Router couldn't provide without hand-rolled workarounds.

**Props a layout receives:** `children` (the nested layout or page below it) and, if its own folder segment is dynamic (Topic 5), `params` for that segment. A layout does **not** receive `searchParams`, and it has no built-in way to read the current pathname either. This isn't an oversight, and it isn't *only* about query-string reactivity — the official framing is more fundamental: layouts are explicitly cached and reused across navigations, and Next.js deliberately restricts a layout from accessing the raw request (the live query string, headers-derived-per-request values) specifically to prevent slow or expensive user code inside a layout from re-running and blocking navigation. If layouts re-rendered on every query-string change, the persistence guarantee above would be broken for the extremely common case of a page updating its own query string (pagination, filters, sort order) — that's the *consequence*; the *cause* is the deliberate architectural boundary around what a cached, non-rerendering layout is allowed to touch. Only `page.tsx` (and Route Handlers) receive `searchParams`. To read pathname or search params reactively from inside a layout's subtree, the answer is the same either way: pull that piece into a Client Component using `usePathname`/`useSearchParams` (Topic 12) — Client Components do re-render on navigation, so they're the escape hatch layouts deliberately don't provide by default.

Typing a layout with the framework-generated helper looks like this:

```tsx
// app/dashboard/layout.tsx  — assume app/dashboard/@analytics also exists
export default function DashboardLayout(props: LayoutProps<'/dashboard'>) {
  return (
    <>
      {props.children}
      {props.analytics} {/* typed automatically from the @analytics folder */}
    </>
  );
}
```

`LayoutProps<Route>` is generated the same way `PageProps<Route>` is (Phase 1, Topic 5) — during `next dev`/`next build`/`next typegen` — and additionally infers a typed prop for every parallel-route slot at that segment (Topic 7), so adding an `@analytics` folder makes `props.analytics` show up with full autocomplete without hand-writing its type.

> **Check yourself:** If a layout could read `searchParams`, what specific guarantee described above would break the moment a sibling page updated its query string?

## Gotchas

- **Assuming every navigation re-runs every layout in the chain.** It doesn't — only layouts that are *not* shared between the previous and next route remount; shared ones persist. Debugging "why didn't my `useEffect` in the layout re-run" often traces back to not realizing the layout never unmounted in the first place.
- **Reaching for `searchParams` in a layout and finding it's simply not there.** This is by design (see above), not a bug — the fix is either moving that logic into the page, or reading the URL client-side via `useSearchParams` (Topic 12) inside a Client Component nested in the layout.
- **Forgetting a layout can independently fetch data.** Each layout in the chain can be its own `async` Server Component making its own request — you don't need to fetch everything in the page and pass it down; this ties directly into parallel data fetching (Phase 4).
- **Navigating across two different root layouts triggers a full page load, not a client-side transition.** If your app has multiple root layouts (Topic 4 covers how — via route groups, or simply omitting `app/layout.tsx` so subdirectory layouts become root layouts themselves), moving between routes owned by different root layouts loses all the persistence benefits described above for that specific navigation, because the browser is genuinely reloading, not transitioning. This is a real architectural cost to weigh before splitting an app into multiple root layouts casually.

## Interview Questions

**Q (High): Does a shared layout remount when navigating between two child routes that both use it? What's the practical implication?**

Answer: No — Next.js keeps a shared layout's component instance mounted across navigations between routes that share it; only the parts of the tree that actually differ (typically the `page.tsx`) swap out. Practically, this means any local state, scroll position, or open UI (an expanded panel, a media player) inside that layout survives navigation without extra work — this is the mechanism that makes persistent UI like a sidebar or audio player practical in App Router.

The trap: assuming React Server Components re-render "the whole tree" on every navigation the way a simpler SPA router might — the persistence of unchanged layout segments is a specific, named guarantee, not an accident of implementation.

**Q (High): Why can't `layout.tsx` access `searchParams` the way `page.tsx` can?**

Answer: Because layouts are meant to persist across navigations, including navigations that only change the query string (pagination, sorting, filters). If a layout re-rendered every time `searchParams` changed, it would defeat its own persistence guarantee for one of the most common types of in-page navigation. Only `page.tsx` (and Route Handlers) receive `searchParams`, scoping query-string reactivity to exactly the part of the tree meant to respond to it.

The trap: treating this as an arbitrary API limitation rather than a direct consequence of the persistence model — a senior answer connects the missing prop to the behavior it protects.

**Q (Medium): If you need logic to re-run on every query-string change, where does it belong — the layout or the page?**

Answer: The page (or a Client Component using `useSearchParams`, Topic 12) — because only `page.tsx` receives `searchParams` as a prop, and because putting reactive-to-query-string logic in a layout would be structurally impossible without breaking the layout's persistence contract.

The trap: proposing to "just read `searchParams` in the layout somehow" instead of recognizing this is a hard boundary, not a missing convenience API.

**Q (Medium): How would you preserve an open modal's state or a scroll position across navigation between two sibling routes?**

Answer: Put the stateful UI (the modal, the scrollable container) inside a layout that's shared by both sibling routes rather than inside each `page.tsx` individually — since the layout isn't remounted on navigation between routes it wraps, any local state or DOM state (like scroll offset) inside it survives automatically, with no manual persistence logic required.

The trap: reaching for a global state library or manual scroll-restoration code as the first idea, without considering that the layout nesting boundary itself is often the simplest solution.

**Q (Low): What props does a layout component receive?**

Answer: `children` (the nested layout or page it wraps) and `params` for its own route segment if that segment is dynamic — but not `searchParams`, and no built-in pathname access either.

The trap: answering "the same props as a page," missing the `searchParams` exclusion specifically.

**Q (Medium): What does the `LayoutProps<Route>` helper type give you beyond a manually written `{ children: React.ReactNode }`?**

Answer: A correctly-typed `params` for the layout's own segment, and — the part manual typing can't replicate without duplicating folder knowledge — a typed prop for every parallel-route slot (`@analytics`, `@team`, etc.) actually present at that segment, inferred directly from the directory structure. It's generated during `next dev`/`next build`/`next typegen`, so adding or removing a slot folder updates the type automatically rather than requiring a manual edit that could drift out of sync.

The trap: not connecting `LayoutProps` to parallel routes specifically — its main advantage over hand-written props is exactly the slot inference, not just typing `children`.

**Q (Medium): Does navigating between two routes that live under different root layouts behave the same as navigating within one root layout's subtree?**

Answer: No — it triggers a full page load rather than a client-side transition, since crossing root layouts means the browser is genuinely reloading the document, not performing a partial React tree update. This erases the persistence benefits (preserved state, no remount) for that specific navigation, which is a real cost to weigh when deciding whether to split an app into multiple root layouts.

The trap: assuming App Router's persistence guarantees are unconditional regardless of how many root layouts an app has.

---

## Self-Assessment

- [ ] Can state from memory that shared layouts persist across navigation rather than remounting
- [ ] Can explain concretely why that persistence is why `searchParams` isn't available to layouts
- [ ] Can trace, for a three-level-deep route, the outer-to-inner order layouts wrap in
- [ ] Can name a real UI pattern (sidebar, audio player, open modal) that depends on this persistence
- [ ] Knows each layout can independently fetch its own data as an async Server Component
- [ ] Can explain what `LayoutProps<Route>` adds beyond manual typing, specifically re: parallel-route slots
- [ ] Knows navigating across two different root layouts causes a full page load, not a client-side transition

---
*Next: Templates vs layouts — the file that looks like a layout but deliberately does the opposite: remounting fresh on every navigation instead of persisting.*
