# Revalidating Data After a Mutation

**Demo:** `app/playground/phase-05-server-actions/06-revalidating-after-mutation` — run `npm run build && npm run start` (production mode — `'use cache'` behavior isn't reliably observable under `next dev`), visit
`/playground/phase-05-server-actions/06-revalidating-after-mutation`. Verified end-to-end via raw POSTs:
`updateTag`, `revalidateTag`, and `revalidatePath` all regenerate the cached headline; `refresh` — tested
in isolation, immediately after a clean baseline — leaves it byte-for-byte identical while still updating
the plain counter.

## Quick Reference

| Call | Scope | Response behavior (JS-hydrated RPC dispatch) | Best for |
|---|---|---|---|
| `updateTag(tag)` | One tag | Immediately expires; bundles a fresh re-render into the action's own response | Read-your-own-writes — the user must see their change right away |
| `revalidateTag(tag, profile)` | One tag | Stale-while-revalidate; does **not** bundle a re-render into the action's response | Content where a brief staleness window is acceptable |
| `revalidatePath(path)` | A whole route (via its soft tags) | Same immediate, bundled behavior as `updateTag` | No specific tag to target, or several unrelated cache entries under one path |
| `refresh()` | Nothing cached — re-renders only | Re-fetches the current route's RSC payload, invalidates zero cache entries | UI depending on state *outside* the cache system (a plain in-memory read, a header, a cookie) |

## Where Does This Run?

All four calls only work inside a Server Action (`updateTag` and `refresh` exclusively so; `revalidateTag`/`revalidatePath` also work in Route Handlers, Phase 6). They execute as part of the action's server-side request — there's no client-side equivalent to any of them.

## What Is This?

Every mutation topic so far (2 through 5) has quietly called `revalidatePath` after writing data, without asking why that specific call, in that specific place. This topic is the decision behind that line: after a Server Action changes data, something has to tell Next.js which cached reads are now stale, and how urgently the UI needs to reflect the change. Four functions answer that differently, and picking the right one is really answering two separate questions: **what** should be invalidated (a tag, or a whole path?), and **how urgently** should the user see the new value (right now, in this same response, or is a brief delay acceptable)?

> **Check yourself:** Of the four functions, which one is the odd one out in that it doesn't invalidate any cached data at all?

## Why Does It Exist?

Phase 3 established the caching layer itself (`'use cache'`, `cacheTag`, `cacheLife`) as something that exists to avoid re-doing expensive work on every request. A mutation breaks that assumption for whatever it just changed — some previously-cached read is now wrong. Revalidation exists to repair that gap deliberately rather than by accident: without it, a cached entry would sit wrong until its `cacheLife` window naturally expired, which for a `max` profile (as this topic's demo uses) could be up to a month. On-demand revalidation is what lets a mutation and its cache invalidation happen together, on purpose, in the same code path.

## How It Works

### Immediate vs. stale-while-revalidate is a real, distinct choice

`updateTag` and `revalidateTag` both invalidate the same kind of thing — a tag set via `cacheTag` inside a `'use cache'` function (Phase 3) — but with different urgency. `updateTag` expires it immediately: the very next read, including the one that produces this action's own response, gets fresh data. `revalidateTag` schedules a background refresh under a stale-while-revalidate model — other requests hitting that tag while the refresh is still in flight keep seeing the old value. `revalidatePath` sits in the "immediate" category alongside `updateTag`, but scoped by route path (via Next's internal soft-tag system, which tags every layout segment and the leaf route automatically) rather than by an explicit tag — useful when you want "everything cached under this route" invalidated without knowing or caring which specific `cacheTag` calls are involved.

### The "bundled re-render" distinction is specific to the JS-hydrated dispatch path

Topic 1 covered the single-roundtrip model: when a Server Action calls `updateTag`, `revalidatePath`, `refresh`, mutates cookies, or calls `redirect`, its response bundles both the action's return value and a freshly rendered RSC payload for the current route — the client applies that as a seeded navigation, with no follow-up fetch. `revalidateTag`'s stale-while-revalidate profile is the documented exception: it does **not** bundle a fresh re-render into that response, precisely because the point of stale-while-revalidate is to keep serving the *old* value a little longer, not to force an immediate visible change.

This distinction describes what happens in a **JS-hydrated browser**, dispatching the action as a fetch-based RPC call — the scenario Topic 1's mechanics apply to directly. Testing this topic's demo via a raw, no-JS-style form POST (the progressive-enhancement fallback path, Topic 8) surfaces a related but different fact, verified directly: that fallback always renders a **complete, fresh page** for its response, because it has no separate "action result" and "current route" messages to keep apart the way the RPC path does — it's one full server render, period. Since the mutation and the fallback's own read happen sequentially within that single request, the read naturally sees the just-invalidated tag and regenerates — for `revalidateTag` just as much as `updateTag` — which is a fact about how the no-JS fallback works, not a contradiction of the RPC-path bundling rule Topic 1 described.

### `refresh()` genuinely invalidates nothing — verified directly, twice

`refresh()` is the one call in this group with no relationship to the cache system at all: it re-renders the current route's RSC payload, full stop, without expiring any tag or path. This topic's demo confirms it concretely: clicking the `refresh` button updates the plain, never-cached `mutationCount` (which was always going to reflect the latest write on any fresh render) while leaving the cached headline's timestamp and id **completely unchanged** — the exact same cached entry gets served again, not regenerated. (An earlier, less careful pass at this test showed the headline changing after `refresh()` too — that turned out to be contamination from a `revalidatePath` call immediately beforehand in the same test run, not a real effect of `refresh()` itself. Isolating `refresh()` cleanly, straight from an untouched cached baseline, confirmed the documented behavior exactly. Worth remembering as a debugging lesson on its own: order of operations matters when verifying cache behavior by hand.)

`refresh()`'s actual use case is the mirror image of the other three: a view that depends on something *outside* the cache layer entirely — a plain in-memory value like this demo's counter, a cookie, a header, some other request-scoped state — where there's genuinely nothing to invalidate, only a re-render to trigger so the current route picks up that already-fresh value.

## Gotchas

- **`updateTag` and `refresh()` are Server-Action-only.** `revalidateTag` and `revalidatePath` also work from Route Handlers (Phase 6); reaching for `updateTag` or `refresh()` there is a compile-time mistake, not a runtime surprise.
- **`revalidatePath` invalidates via Next's automatic soft-tag system, not the explicit tags you wrote with `cacheTag`.** It's broader by design — invalidating "everything under this path" rather than one specific piece of cached data — which is exactly why the docs recommend tag-based revalidation when you know precisely what changed, reserving `revalidatePath` for when you don't want to enumerate every tag involved.
- **Testing cache invalidation behavior through a no-JS-style raw POST (curl, or JavaScript genuinely disabled) can look identical for `updateTag`/`revalidatePath`/`revalidateTag`, even though the docs describe `revalidateTag`'s stale-while-revalidate response as *not* bundling a re-render.** That specific nuance is about the JS-hydrated RPC dispatch path's two-message model; the no-JS fallback is a single always-fresh full-page render, so don't conclude from a curl test alone that the stale-while-revalidate distinction doesn't exist — it does, just not observable that way.
- **`'use cache'` entries don't behave reliably under `next dev`** — this topic's demo needed `next build && next start` to observe real caching. Verifying cache-related claims against a dev server risks drawing the wrong conclusion, same lesson Phase 3's topics already established.

## Interview Questions

**Q (High): After a Server Action mutates data cached with `cacheTag('foo')`, what's the difference between calling `updateTag('foo')` and `revalidateTag('foo', 'max')`?**

Answer: Both invalidate the same tag, but with different urgency. `updateTag` expires it immediately — the very next read gets fresh data, and (in the JS-hydrated dispatch path) the action's own response bundles a fresh re-render so the user sees the change right away, a read-your-own-writes guarantee. `revalidateTag` uses a stale-while-revalidate model: it schedules a background refresh, but other requests may keep seeing the old value for a window defined by the given profile, and — specifically in the JS-hydrated RPC dispatch path — the action's own response does not bundle a fresh re-render the way `updateTag`'s does.

The trap: describing them as interchangeable "revalidate this tag" calls without naming the urgency/response-bundling difference, which is the entire reason both exist rather than one.

**Q (High): What does `refresh()` actually do, and how is that fundamentally different from the other three revalidation functions?**

Answer: `refresh()` re-renders the current route's RSC payload without invalidating any cached data at all — it has no relationship to tags or paths. The other three (`updateTag`, `revalidateTag`, `revalidatePath`) all exist to fix a cache entry that a mutation just made stale. `refresh()` exists for the opposite situation: a view depends on something that was never cached in the first place (a cookie, a header, plain in-memory state), so there's nothing to invalidate — only a re-render needed so the current route picks up that already-current value.

The trap: assuming `refresh()` is "a weaker `revalidatePath`" or somehow still touches the cache — it's categorically different, not a lesser version of the same idea.

**Q (Medium): `revalidatePath('/posts')` and `revalidateTag('posts')` both invalidate something related to a `/posts` route. What's actually different about what each one invalidates?**

Answer: `revalidatePath` invalidates via Next's automatically-generated soft tags for that route path (covering every layout segment plus the leaf route) — everything cached under that path, without needing to know which explicit `cacheTag` calls are involved. `revalidateTag('posts')` invalidates only cache entries explicitly tagged `'posts'` via `cacheTag('posts')` inside a `'use cache'` function — narrower and more precise, but only as complete as the tagging was thorough.

The trap: treating `revalidatePath` as just a path-shaped alias for `revalidateTag` — the underlying mechanism (automatic soft tags vs. explicit developer-set tags) is genuinely different, which is why the docs recommend tag-based revalidation as more precise when you know exactly what changed.

**Q (Medium): Where are `updateTag` and `refresh()` allowed to be called, and where are they not?**

Answer: Both are Server-Action-only. `revalidateTag` and `revalidatePath`, by contrast, are also usable from Route Handlers. Calling `updateTag` or `refresh()` from a Route Handler is a build/type error, not something that fails only at runtime.

The trap: assuming all four revalidation functions share the same allowed contexts just because they're all imported from `next/cache` and all discussed together.

**Q (Low): Why did this topic's demo need to run under `next build && next start` instead of `next dev` to observe correct behavior?**

Answer: `'use cache'` entries don't reliably persist and behave the way they do in a real deployment when running under `next dev` — a pattern already established in this repo's Phase 3 material. Testing cache-invalidation-specific claims (does this value stay the same, does it change) against a dev server risks drawing an incorrect conclusion about behavior that only manifests correctly in a production-mode build.

The trap: assuming `next dev` and `next build && next start` are interchangeable for verifying anything cache-related, when dev mode's relaxed caching is specifically designed to prioritize iteration speed over faithfully reproducing production cache behavior.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the urgency difference between `updateTag` and `revalidateTag` in one sentence
- [ ] Can explain what `revalidatePath` invalidates and how that differs from `revalidateTag`
- [ ] Can explain why `refresh()` is categorically different from the other three, not just "weaker"
- [ ] Can name which two of the four are Server-Action-only vs. also usable in Route Handlers
- [ ] Can explain why the "bundled re-render" distinction is specific to the JS-hydrated RPC path, not the no-JS fallback
- [ ] Knows to verify `'use cache'` behavior against a production build, not `next dev`

---
*Next: Server Action security — every action across this phase has called `revalidatePath` or similar without a second thought about who's allowed to trigger it; this next topic is the full treatment of that question, including a real ownership-check (IDOR) demo.*
