# The Router Cache, Prefetching & `<Activity>`

**Demo:** `app/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity` — run `npm run dev`, visit the page, click into Page A, increment its counter, navigate to Page B and back to Page A. This one is genuinely interactive; it can't be verified with `curl` the way earlier demos were — you have to click through it yourself in a browser.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `<Link>` entering the viewport | Triggers an automatic prefetch in production | By the time you click, the resources are often already in browser memory |
| Client Cache | In-memory RSC payload store, keyed by route segment, in the browser | Powers instant client-side transitions; cleared on a full page refresh |
| `partialPrefetching: true` | One shared **App Shell** prefetch per route, not one prefetch per link | A page with many links to the same route makes far fewer prefetch requests |
| `<Activity>` (Cache Components) | Hides previous routes (`display: none`) instead of unmounting them | `useState`, scroll position, form drafts, and DOM survive navigating away and back |

## Where Does This Run?

The browser. Everything in this topic — prefetching, the Client Cache, `<Activity>`-based state preservation — is client-side behavior, in contrast to nearly everything else in this phase, which has been about what happens on the server.

## What Is This?

Two related but distinct mechanisms make Next.js navigation feel instant, and Cache Components changes both:

1. **Prefetching + the Client Cache**: `<Link>` fetches a route's data *before* you click it, storing the result in browser memory, so the actual navigation is often just swapping in already-downloaded content.
2. **`<Activity>`-based state preservation**: navigating away from a route no longer unmounts it — Next.js hides it (`display: none`) instead, so React state and DOM state (scroll position, open `<details>`, video playback position, form drafts) survive the round trip.

These solve different problems (data being ready vs. UI state surviving) but both exist for the same underlying goal: navigating around the app should feel like a single continuous experience, not a series of fresh page loads.

> **Check yourself:** Without looking, explain in one sentence why "the data is prefetched" and "the component's state survives navigation" are two separate concerns that could each fail independently.

## Why Does It Exist?

Before Cache Components, preserving page-level state across navigations required real workarounds: hoisting state up to a shared layout that never unmounts, or reaching for an external store just to survive a round trip to another route and back. Every navigation was, by default, a genuine unmount-and-remount of the destination — which is correct and often desirable (a fresh page should usually start fresh), but actively hostile to anything a user was mid-way through: a half-filled form, a scroll position, an expanded panel, a video paused partway through. `<Activity>` removes the trade-off: state is preserved by default, and you opt back into resetting specific pieces of it where that's actually what you want (Gotchas below).

## How It Works

### Prefetching, before Partial Prefetching

By default, `<Link>` prefetches as it enters the viewport in production (never in development). What gets prefetched depends on the route:

| | Static page | Dynamic page |
|---|---|---|
| Prefetched | Full route | Only if it has a `loading.js` boundary |
| Client Cache TTL | 5 min default | Off, unless configured |
| Server roundtrip on click | No | Yes, streamed after the shell |

Next.js maintains a small prefetch task queue: links currently in the viewport go first, links showing intent (hover/touch) next, newer requests bump older ones, and anything scrolled off-screen is dropped — this keeps a page full of links from flooding the network.

### Partial Prefetching: one App Shell per route

With `partialPrefetching: true` (requires `cacheComponents`), the model changes from "prefetch every linked route in full" to "prefetch one reusable App Shell per *route*, shared across every link that points to it." A page with 50 links to the same product listing route makes roughly one prefetch request, not 50. The rest — content that depends on the specific link's URL data (`searchParams`, dynamic `params`) — resolves after navigation, behind the shell's own `<Suspense>` boundaries, unless a specific link opts into resolving it ahead of time with `<Link prefetch={true}>` (per-link prefetching, which effectively re-runs Topic 8/9's App-Shell-upgrade flow *before* the click instead of after it).

> **Good to know:** Routes reading `cookies()`/`headers()` produce an App Shell that includes session-specific content — Next.js auto-detects this and caches that shell per-session on the client rather than sharing it across users.

### The Client Cache's lifetime: `stale`

How long the Client Cache can reuse a prefetched or previously-visited segment without a server check is controlled by [`cacheLife`'s `stale` property](Topic 6) per-function (recommended) or globally via the older `staleTimes` config. Either way, **a 30-second minimum is enforced**, specifically so a prefetch survives long enough for a user to actually click it after hovering. Calling `revalidateTag`, `revalidatePath`, or `updateTag` from a Server Action clears the *entire* client cache immediately, bypassing the stale time — mutations always win over "the cache says this is still fresh."

### `<Activity>`: hide, don't unmount

Cache Components uses React's `<Activity>` component to keep up to **3 recently visited routes** mounted-but-hidden (`display: none`) rather than destroying them on navigation. Effects clean up when a route is hidden and re-run when it becomes visible again — same lifecycle as an unmount/remount for effects specifically, but `useState` values and raw DOM state (scroll position, `<details open>`, video currentTime) are untouched, because the DOM node was never actually removed. Beyond 3 routes, the oldest is evicted and re-renders fresh next time.

## Gotchas

- **Prefetching runs side effects if your component isn't pure.** Analytics tracking or any other side effect placed directly in a layout/page body runs when the route is *prefetched*, not when it's actually visited. Move side effects into a `useEffect` (or trigger them from a Server Action), not the component body.
- **Transient UI (dropdowns, popovers) stays open across navigation unless you reset it.** Activity preserves `isOpen` state by default — correct for a sidebar's expanded filter panel, wrong for a menu that should always start closed. Reset it in a `useLayoutEffect` cleanup function so it happens synchronously before the route hides:

  ```tsx
  useLayoutEffect(() => {
    return () => setIsOpen(false) // runs when Activity hides this component
  }, [])
  ```

- **A dialog's "run once when opened" initialization effect won't re-fire if the dialog was already open when the user navigated away.** `isDialogOpen` stays `true` across the round trip, so re-showing the route doesn't produce a state *change* to trigger the effect. The fix is deriving dialog-open state from something outside the preserved component state — a search param — so returning to the route with the param present is a genuine state change, not a no-op.
- **`display: none` does not pause `<video>`/`<audio>`.** Add explicit `useLayoutEffect` cleanup calling `.pause()`, or media keeps playing invisibly in the background while a user browses elsewhere.
- **Global styles from a hidden page can still apply to the visible one**, since the hidden page's `<style>` tag is still in the document. Toggle the stylesheet's `media` attribute in a cleanup function, or prefer scoped `data-*` attributes over broad selectors for anything meant to be page-local.
- **End-to-end tests can accidentally interact with hidden content.** `display: none` elements remain queryable by most selectors; use visibility-aware queries (`getByRole` in Playwright, which reads the accessibility tree and excludes hidden elements) rather than raw locators.

## Interview Questions

**Q (High): Before Next.js 16, preserving a form's draft input across a navigation-away-and-back required hoisting state to a shared layout or an external store. What changed, and why does the fix work?**

Answer: Cache Components uses React's `<Activity>` component to hide routes (`display: none`) on navigation instead of unmounting them, for up to 3 recently visited routes. Since the DOM node and component instance are never destroyed, `useState` values and raw DOM state (input values, scroll position) survive automatically with no extra code — the earlier workarounds existed specifically because unmounting used to be unconditional, and there was no way to opt a single route out of it without restructuring where the state lived.

The trap: assuming this is purely a routing/caching change — it's fundamentally a React rendering-model change (`<Activity>`), which Next.js adopts at the route level; understanding *why* it preserves state (nothing is destroyed) rather than just *that* it does is what separates a strong answer.

**Q (High): A dropdown menu stays open after a user navigates away and back to a page. Why, and what's the fix?**

Answer: `<Activity>` preserves component state by default, including a dropdown's `isOpen` boolean — from the framework's perspective, nothing distinguishes "intentional persistent view state" (a filter panel) from "transient interaction state" (a menu) unless the developer says which one this is. The fix is resetting the transient state explicitly in a `useLayoutEffect` cleanup function, which runs synchronously when Activity hides the component, so the dropdown is already closed before the user sees it hidden and re-shown later.

The trap: reaching for a regular `useEffect` instead of `useLayoutEffect` — the synchronous timing matters here to avoid a flash of the stale (open) state before the reset takes visual effect.

**Q (Medium): What's the difference between the default `<Link>` prefetch behavior and `partialPrefetching: true`, in terms of what actually gets requested?**

Answer: By default, prefetching is per-link and roughly all-or-nothing per route (a static route's full content, or a dynamic route's content only if it has a `loading.js` boundary). With `partialPrefetching: true`, prefetching becomes per-*route*: every `<Link>` to the same destination shares one prefetched App Shell, fetched once regardless of how many links on the page point there, with URL-specific content resolving after navigation (or ahead of it, opt-in, via `<Link prefetch={true}>`).

The trap: describing Partial Prefetching as "prefetching less" — it's prefetching *differently structured* content (a shared, reusable shell) that happens to often mean fewer total requests, not a blanket reduction in what's fetched.

**Q (Medium): Why is a 30-second minimum enforced on the Client Cache's `stale` time, and what would break without it?**

Answer: `stale` determines how long a prefetched or previously-visited route stays usable from the Client Cache without a server check. If a value shorter than the time it typically takes a user to notice a link and click it were allowed, a prefetch could go stale (or trigger an unwanted re-fetch) before the click even lands, largely defeating the purpose of prefetching in the first place. The 30-second floor guarantees a realistic window between "link entered the viewport" and "user actually clicked it."

The trap: not connecting this specifically to prefetching's timing — it's easy to describe the minimum as an arbitrary safety rail rather than a deliberate response to how prefetch-then-click actually plays out in practice.

**Q (Low): Does calling `revalidateTag` from a Server Action wait for the Client Cache's `stale` window to expire before taking effect?**

Answer: No — mutation-triggered revalidation (`revalidateTag`, `revalidatePath`, `updateTag`, called from a Server Action) clears the entire Client Cache immediately, regardless of how much of the configured `stale` window remains. The `stale` time governs passive reuse absent any signal that something changed; an explicit mutation is exactly that signal, so it bypasses the timer rather than waiting it out.

The trap: assuming `stale` is an unconditional floor on cache lifetime — it's a default for the "nothing else happened" case, not a guarantee that outlasts an explicit invalidation.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the difference between "prefetching" and "state preservation" as two separate mechanisms
- [ ] Can explain what changes about `<Link>` prefetch behavior with `partialPrefetching: true`
- [ ] Can explain why `<Activity>` preserves `useState` and DOM state across navigation
- [ ] Can write the `useLayoutEffect` cleanup pattern for resetting transient UI state on navigation-away
- [ ] Can explain why side effects in a component body are dangerous under prefetching

---
*Next: Cache Components vs the Previous Model — a direct comparison and migration reference, useful both for interviews ("how did this used to work?") and for recognizing pre-16 code in the wild.*
