# `cacheLife` — Time-Based Revalidation & Cache Profiles

**Demo:** `app/playground/phase-03-rendering-caching/06-cachelife-time-based-revalidation` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/06-cachelife-time-based-revalidation`, and refresh a few times over about 30 seconds to watch the value change.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `cacheLife('hours')` | A preset profile: `stale` 5m / `revalidate` 1h / `expire` 1d | Three separate timers, not one number |
| `stale` | How long the **client/browser** can reuse cached content with zero network check | Controls the Client Cache (Topic 10), enforced with a 30s minimum |
| `revalidate` | How long the **server** serves this value before regenerating it in the background | Stale-while-revalidate — the visitor who triggers it still gets the old value instantly |
| `expire` | The point past which the server blocks and regenerates synchronously | Correctness starts to matter more than speed |
| No `cacheLife` call at all | Implicit `default` profile: 5m / 15m / never | Works, but the lifetime is invisible at the call site |

## Where Does This Run?

Server (setting `revalidate`/`expire`, which govern server-side regeneration) and, via `stale`, the browser's own in-memory Client Cache. `cacheLife` is only meaningful inside a `"use cache"` scope (Topic 5) — it's the tuning knob for a cache directive's lifetime, not a standalone API.

## What Is This?

Topic 5 established that `"use cache"` makes a result persist across requests. `cacheLife` answers the obvious follow-up: *for how long, and what happens when that time is up?* Rather than one duration, Next.js splits this into three separate, deliberately distinct timers that together describe a stale-while-revalidate policy:

```tsx
import { cacheLife } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM products')
}
```

> **Check yourself:** Without looking, explain the difference between `stale` and `revalidate` in one sentence each. If you can't state a clear difference, re-read the definitions below before continuing.

## Why Does It Exist?

A single "cache for N seconds" number can't express what most real applications actually want: users should get instant responses from cache (not wait on a background regeneration), but the *server* should still refresh its copy periodically so the cache doesn't drift too far from reality, and there should be a hard ceiling past which serving stale data is no longer acceptable even at the cost of one slow response. `stale`/`revalidate`/`expire` name these three concerns explicitly instead of collapsing them into one number and hoping the defaults are close enough.

## How It Works

### The three timers, precisely

- **`stale`** (client-side): how long the browser's Client Cache can serve this content with **zero** network request. After it elapses, the next navigation checks with the server. The server communicates this via an `x-nextjs-stale-time` response header. **A 30-second minimum is enforced**, regardless of configuration, so prefetched links don't go stale before a user can click them.
- **`revalidate`** (server-side): after this elapses, the *next* request serves the currently cached value immediately, while the server regenerates the content in the background and updates the cache for subsequent requests. This is Incremental Static Regeneration's actual mechanism (Topic 9 extends this to whole routes with unknown params).
- **`expire`** (server-side, outer bound): after this elapses with no traffic to trigger a background refresh, the *next* request blocks — no stale content is served, the server regenerates synchronously before responding. `expire` must be longer than `revalidate`; Next.js validates this and errors on invalid configurations.

### Preset profiles

| Profile | Use case | `stale` | `revalidate` | `expire` |
|---|---|---|---|---|
| `default` | Standard content | 5 min | 15 min | never |
| `seconds` | Real-time data | 30 sec | 1 sec | 1 min |
| `minutes` | Frequently updated | 5 min | 1 min | 1 hour |
| `hours` | Multiple daily updates | 5 min | 1 hour | 1 day |
| `days` | Daily updates | 5 min | 1 day | 1 week |
| `weeks` | Weekly updates | 5 min | 1 week | 30 days |
| `max` | Rarely changes | 5 min | 30 days | 1 year |

You can also pass an inline object for one-off tuning (`cacheLife({ stale: 3600, revalidate: 900, expire: 86400 })`), or define named custom profiles in `next.config.ts` — including **redefining** built-ins like `default` or `max` project-wide. Redefining a time-named profile like `hours` is riskier than redefining `default`/`max`, since a reader's intuition about what "hours" means is now wrong unless they check the config.

### Prerendering behavior: short lifetimes become dynamic holes

A cache lifetime that's "too short" changes *where* the content can live, not just how often it refreshes:

- `revalidate: 0`, or `expire` under 5 minutes → excluded from prerendering entirely, becomes a dynamic hole resolved at request time (needs `<Suspense>`, same as Topic 2's runtime reads).
- `stale` under 30 seconds → also excluded — a prefetch would go stale before a click could land.
- `stale` between 30 seconds and 5 minutes → included in the prerender, but excluded from the route's **App Shell** specifically (Topic 1's App Shell needs at least 5 minutes of `stale` to be worth sharing across visitors as the default prefetch payload).

Of the presets, only `seconds` crosses any of these thresholds (its 1-minute `expire`), which is exactly why it's for genuinely real-time content, not a general-purpose "short" option.

> **Check yourself:** A `"use cache"` function uses `cacheLife({ revalidate: 0 })`. Does its output ever appear in the static shell? What does that imply about whether it needs a `<Suspense>` boundary?

### Nested caching behavior

When a cached function/component calls another cached function/component, the **outer** cache's own explicit `cacheLife` always wins, regardless of whether it's longer or shorter than the inner one. If the outer cache has *no explicit* `cacheLife`, it falls back to `default` (15 min revalidate) — and a shorter inner lifetime can pull the outer's effective lifetime down, but a longer inner one cannot extend it past `default`.

This is precisely why an explicit `cacheLife` is recommended on every `"use cache"` scope: without one, a component's actual cache behavior secretly depends on what it happens to call internally, which is easy to lose track of as a codebase grows. Next.js goes further for the sharpest version of this problem: nesting a short-lived cache (`seconds`, or any `revalidate: 0`/`expire` under 5 min) inside an outer cache with **no explicit** `cacheLife` is a **build error**, not silent propagation — because the short lifetime might be buried in an imported component or even a third-party dependency, where it would otherwise silently and invisibly shrink the outer cache's lifetime. Fix it by giving the outer scope its own explicit lifetime (to stay static) or explicitly acknowledging the short lifetime is intentional (wrapping in `<Suspense>`).

## Gotchas

- **"Serve stale instantly, regenerate silently in the background" fits a whole prerendered route (Topic 9's ISR) more cleanly than a single short-lived `"use cache"` function.** A lifetime short enough to be excluded from the static shell (this topic's "Prerendering behavior" section) never has a previously-built artifact to fall back to — there's no old prerendered page sitting on disk to serve while a new one renders. In that case, the request that crosses the `revalidate` boundary can end up waiting on the regeneration itself, rather than getting the old value instantly. The demo for this topic deliberately uses a short-enough lifetime to make this observable: watch the response time, not just the value, on the refresh that crosses the 5-second mark.
- **`stale` is not a `Cache-Control` header.** It governs Next.js's own Client Cache (the RSC payload store in browser memory), communicated via `x-nextjs-stale-time` — it's a separate concern from HTTP caching semantics.
- **Calling `cacheLife` more than once per invocation is undefined/unsupported** — you can call it conditionally in different branches, but only one call should execute per function invocation (see "conditional cache lifetimes" below for the supported pattern).
- **A cache-life-based revalidation is triggered by a request, not by a timer firing globally.** Pages using a tag or profile revalidate as *they* are visited, not all at once — there's no background cron regenerating everything the instant a window closes.

### Conditional cache lifetimes

You can call `cacheLife` in different branches, as long as exactly one executes:

```tsx
async function getPostContent(slug: string) {
  'use cache'
  const post = await fetchPost(slug)
  if (!post) {
    cacheLife('minutes') // Not yet published — check back soon
    return null
  }
  cacheLife('days') // Published — safe to cache longer
  return post.data
}
```

## Interview Questions

**Q (High): Explain the difference between `stale`, `revalidate`, and `expire` — and why collapsing them into one "cache duration" number would be worse.**

Answer: `stale` controls the *client's* browser cache — how long a navigation can reuse content with zero server round-trip. `revalidate` controls how long the *server* keeps serving a value before regenerating it in the background on the next request (stale-while-revalidate: that triggering request still gets the old value instantly). `expire` is the outer bound past which the server can no longer serve stale content at all and must block on a synchronous regeneration. A single number can't express "instant for users most of the time" and "eventually consistent on the server" and "never wrong past this point" simultaneously — collapsing them forces a choice between staleness and slowness that most real content doesn't need to make.

The trap: describing `revalidate` and `expire` as "basically the same thing" — the distinguishing behavior (background regen with stale-while-revalidate vs. blocking synchronous regen) is exactly the kind of mechanical detail interviewers probe for.

**Q (High): A `"use cache"` function has `cacheLife({ revalidate: 0 })`. What does this do to prerendering, and what do you need to add to the component tree?**

Answer: `revalidate: 0` (along with `expire` under 5 minutes) excludes the cached content from the static shell entirely — it becomes a dynamic hole resolved at request time, exactly like an uncached runtime-API read from Topic 2. You need a `<Suspense>` boundary around it, or the build fails the same validation Topic 1–2 covered for any dynamic content.

The trap: assuming a `"use cache"` directive always guarantees inclusion in the static shell just because it's "cached" — a sufficiently short lifetime opts it back out, on purpose.

**Q (Medium): You nest a component using `cacheLife('seconds')` inside an outer `"use cache"` component that calls no `cacheLife` at all. What happens, and why?**

Answer: This is a build error. The outer cache, having no explicit lifetime, defaults to `default` (15 min revalidate) — but Next.js won't let a short-lived inner cache (`seconds`, or any `revalidate: 0`/`expire` under 5 min) silently shrink that outer lifetime without the developer acknowledging it, precisely because the short-lived nested cache might be buried in a component you didn't write yourself. The fix is to give the outer scope an explicit `cacheLife` (to keep it static and confirm the tradeoff) or wrap the whole thing in `<Suspense>` with its own short, explicit lifetime to confirm the short-livedness is intentional.

The trap: assuming nested caches "just compose" without surprises — Next.js deliberately refuses to let this particular composition happen silently.

**Q (Medium): Why is a 30-second minimum enforced on the `stale` value regardless of what's configured?**

Answer: `stale` governs how long a client-side prefetch stays usable. If a prefetched link's content could go stale in, say, 5 seconds, a user who prefetches a link by hovering and then takes 10 seconds to actually click it would get stale (or re-fetched) content, defeating the purpose of prefetching. The 30-second floor guarantees prefetched data survives long enough to actually be clicked.

The trap: treating the minimum as arbitrary rather than connecting it to prefetching behavior specifically (Topic 10 covers prefetching's mechanics in full).

**Q (Low): Is redefining the built-in `hours` profile in `next.config.ts` a good idea?**

Answer: It's supported, but riskier than redefining `default` or `max` — the time-named profiles (`seconds` through `weeks`) carry an intuitive expectation (a reader assumes `'hours'` means roughly hourly-scale timing), so silently changing what it means project-wide is more likely to surprise a future reader than redefining `default` (which implies no specific duration to begin with). Defining a distinctly-named custom profile is usually the safer choice when presets don't fit.

The trap: not knowing this is configurable at all, or not recognizing the naming-collision risk once told it is.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain `stale` vs. `revalidate` vs. `expire` in one sentence each, without conflating any two
- [ ] Can name the preset profile table's rough shape (at least `default`, `seconds`, `max`)
- [ ] Can explain which lifetime thresholds exclude content from the static shell / the App Shell
- [ ] Can explain why nesting a short-lived cache inside an outer cache with no explicit `cacheLife` is a build error
- [ ] Can explain why `stale` has an enforced 30-second minimum

---
*Next: `cacheTag`, `revalidateTag` & `updateTag` — time-based revalidation covers "eventually," but a mutation often needs "right now." This is the on-demand half of the same system.*
