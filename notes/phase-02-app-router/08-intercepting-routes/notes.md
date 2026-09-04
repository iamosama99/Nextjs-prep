# Intercepting Routes (`(.)` / `(..)` / `(...)`)

> **Live demo:** `npm run dev` → [/playground/phase-02-app-router/08-intercepting-routes](http://localhost:3000/playground/phase-02-app-router/08-intercepting-routes)

## Quick Reference

| Convention | Matches segments... |
|---|---|
| `(.)` | at the **same** route level |
| `(..)` | **one** level above |
| `(..)(..)` | **two** levels above |
| `(...)` | from the **root** `app/` directory |

Counted in **route segments**, not filesystem folder depth — route groups and parallel-route slots don't count as a level.

## Where Does This Run?

Client-side navigation only — interception happens when the router performs a **soft navigation** (via `next/link` or `router.push`) client-side. A hard navigation (typed URL, refresh, external link, shared link) bypasses interception entirely and renders the actual target route normally.

## What Is This?

An intercepting route lets navigating to a URL render *different* UI than what that URL would render on a direct visit — most commonly, showing a route as a modal overlaying the current page instead of navigating away from it, while the URL still updates to the "real" route's address. It's what makes a classic photo-feed pattern possible: clicking a photo thumbnail opens it in a modal over the feed, the URL becomes `/photo/123`, but refreshing that exact URL (or sharing the link) loads the full, standalone photo page instead of a modal with nothing behind it.

> **Check yourself:** A user clicks a photo in a feed, sees it open as a modal, and the URL bar now shows `/photo/123`. They refresh the page. What do they see now, and why is that the *correct* behavior rather than a bug?

## Why Does It Exist?

Before this, a "modal with a URL" was a genuinely hard problem. A client-only modal (opened with local state, no route change) has no real URL — refresh loses it, you can't share a direct link to it, back/forward doesn't close it predictably. A real route navigation to `/photo/123` solves the URL problem but loses the modal *context* — the underlying feed unmounts, and the user loses their scroll position and place in the list. Intercepting routes (combined with parallel routes, Topic 7, to render the modal alongside the still-mounted feed) solve both at once: soft navigation gets the modal experience with a real, updating URL; hard navigation to that same URL gets the full, standalone page — because at that point there's no "underlying feed" to overlay onto anyway.

## How It Works

A typical implementation combines an intercepting route with a parallel route slot for the modal:

```
app/
  feed/
    layout.tsx          ← receives { children, modal } — modal is the @modal slot
    page.tsx              → the feed itself
    @modal/
      default.tsx          → renders null when no modal is active
      (.)photo/
        [id]/
          page.tsx          → the intercepted modal version, matches /photo/[id]
  photo/
    [id]/
      page.tsx             → the real, standalone page — used on direct visit/refresh
```

Here, `(.)photo/[id]` sits inside `feed/@modal/` and intercepts navigation to `/photo/[id]` **only when that navigation originates from within `/feed`** via client-side `next/link`/`router.push`. When it fires, the `@modal` slot renders the intercepted `page.tsx` (typically the same content wrapped in modal chrome), the URL updates to `/photo/123`, and the feed underneath stays fully mounted. A hard reload or direct hit on `/photo/123` skips the interception mechanism entirely and resolves to `app/photo/[id]/page.tsx` — the real, full page — because there's no active client-side router session for it to intercept in the first place.

**The dot convention counts route segments, not folders on disk.** `(.)` matches a route at the same segment level as the file that contains the interceptor; `(..)` goes up one route segment; `(...)` jumps all the way to the root. Because route groups and parallel-route slots are themselves invisible in the URL (Topics 4 and 7), they don't count toward this level either — the counting is purely about the actual URL's segment structure, which can be a source of real confusion if you reason about it using filesystem nesting instead.

> **Check yourself:** If your intercepting route file sits inside a parallel route slot (`@modal/`) that itself sits two filesystem folders deep from the segment it needs to intercept, does that folder depth affect whether you use `(.)`, `(..)`, or `(...)`?

## Gotchas

- **The dot-count is about route-segment hierarchy, not file-tree depth** — miscounting because a parallel-route slot folder "feels like" an extra level is the most common mistake with this convention.
- **Interception only applies to soft, client-side navigation.** A hard refresh, a typed URL, or opening a shared link always renders the real target route — this isn't a limitation to work around, it's the entire point: it's what keeps the modal URL shareable and refresh-safe.
- **Intercepting routes are meaningless without a parallel route slot to render into** — in practice, the two conventions are used together almost every time; an intercepting route with nowhere composable to render (no `@modal`-style slot) doesn't achieve the "overlay on top of existing content" effect on its own.

## Interview Questions

**Q (High): What problem do intercepting routes solve that parallel routes alone don't?**

Answer: Parallel routes let multiple segments render simultaneously, but they don't by themselves control *when* a given URL should render as an overlay versus as its own full page. Intercepting routes add that: they let a client-side navigation to a URL render alternate UI (typically into a parallel route slot, like a modal) while the same URL, hit directly, still resolves to its real, standalone page. Together they solve the "modal with a shareable, refresh-safe URL" problem that neither convention solves alone.

The trap: describing intercepting routes as just "another way to define a route" without identifying that the core value is *context-dependent* rendering of the same URL.

**Q (High): Why does a direct page refresh on an intercepted URL show the full page instead of the modal?**

Answer: Interception only happens during a client-side, soft navigation — the router recognizes the navigation originated from within the app and swaps in the intercepting route's UI instead of the real target. A hard refresh has no such client-side router session to intercept anything with; the server simply resolves the URL to whatever route actually owns it, which is the real, standalone page. This is deliberate — it's exactly what makes the modal's URL genuinely shareable and safe to refresh, rather than a broken experience without the underlying feed to overlay onto.

The trap: describing this as a limitation or edge case rather than the mechanism's actual design goal.

**Q (Medium): Explain the `(.)`, `(..)`, `(..)(..)`, `(...)` convention — what are they counted relative to?**

Answer: They're counted in terms of route *segments* in the URL hierarchy: `(.)` intercepts a route at the same segment level as the interceptor file, `(..)` one level up, `(..)(..)` two levels up, and `(...)` from the root `app/` directory regardless of how deep the interceptor itself sits. It is not counted by filesystem folder nesting.

The trap: counting actual folder depth on disk, which gives the wrong answer whenever route groups or parallel-route slots are involved in the path, since those don't count as segments.

**Q (Medium): Do route groups or parallel-route slots count as a "level" for the `(..)` convention?**

Answer: No — since neither route groups (parenthesized folders) nor parallel-route slots (`@folder`) ever appear in the actual URL, they don't count as a route segment level for the purposes of the interception dot-convention; only real, URL-visible segments count.

The trap: assuming every folder in the file path counts equally, leading to off-by-one errors when a parallel-route slot sits between the interceptor and its target.

**Q (Low): Name the classic example use case for intercepting routes.**

Answer: An Instagram-style photo feed, where clicking a photo opens it as a modal over the current feed (URL updates to the photo's own address, feed stays mounted underneath), while directly visiting or sharing that same photo URL loads the full, standalone photo page instead.

The trap: struggling to give a concrete example, or describing a scenario that's really just a client-only modal with no actual URL/deep-linking requirement — which wouldn't need intercepting routes at all.

---

## Self-Assessment

- [ ] Can explain, without notes, why interception only fires on soft navigation and not on refresh
- [ ] Can correctly state what `(.)`, `(..)`, `(..)(..)`, and `(...)` each count relative to
- [ ] Knows route groups and parallel-route slots don't count as a segment level for this convention
- [ ] Can describe the classic photo-feed-modal example concretely, including what happens on direct visit
- [ ] Understands intercepting routes are typically paired with a parallel route slot, not used standalone

---
*Next: `loading.tsx` & instant loading states — the file convention that automatically wraps a route segment in a Suspense boundary, and how it composes with the segment-based architecture parallel and intercepting routes both build on.*
