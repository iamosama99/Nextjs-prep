# Debugging Cache & Rendering Behavior

**Demo:** No new route. Exercise: temporarily remove a `<Suspense>` boundary from Topic 2's demo (`app/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary/page.tsx`) and run `npm run build` to see the exact validation error described below, then put it back.

## Quick Reference

| Tool | What it tells you | When to reach for it |
|---|---|---|
| Dev overlay insight (e.g. `blocking-prerender-dynamic`) | Names the exact component blocking a route from being instant, with fix cards | First line of defense — appears automatically in `next dev` |
| Navigation Inspector (Next.js DevTools) | Freezes the page at its initial loading state, for both page loads and client navigations | Seeing *what actually ships* in the shell, not just whether validation passes |
| `NEXT_PRIVATE_DEBUG_CACHE=1` | Verbose cache/ISR logging to the terminal | Diagnosing why something isn't hitting cache the way you expect |
| `@next/playwright`'s `instant()` helper | E2E assertion scoped to the instant UI, before dynamic content resolves | Locking in "this navigation is instant" as a regression test |

## Where Does This Run?

Development-time tooling (dev overlay, Navigation Inspector, `next build` validation) plus opt-in production logging (`NEXT_PRIVATE_DEBUG_CACHE`) and CI tooling (the Playwright `instant()` helper). None of this is runtime application logic — it's entirely about *observing* the behavior every other topic in this phase described.

## What Is This?

Every topic in this phase describes a rule Cache Components enforces — Suspense boundaries around runtime reads, cache lifetimes, validated static shells. This topic is the other side: what actually happens when you get one of those rules wrong, and how you find out. Cache Components' approach throughout is to **fail loud, at build/dev time**, rather than let a rule violation silently degrade into worse performance or occasionally-stale data discovered in production. The tooling below is what makes "fail loud" actually actionable instead of just an error message you have to reverse-engineer.

> **Check yourself:** Without looking, name the two most common single-line fixes the dev overlay's fix cards suggest for a blocking read, and when you'd reach for each one instead of the other.

## Why Does It Exist?

A rendering model this granular — component-level static/dynamic decisions, three-timer cache lifetimes, tag-based invalidation — has a lot of surface area for a well-intentioned change to quietly regress a route from instant to blocking, or from cached to freshly-computed every time. Without dedicated tooling, these regressions are the kind of thing you'd only notice via a vague "this page feels slower than it used to" report, days or weeks after the change that caused it. Cache Components' validation exists to catch the *specific* mistake at the moment it's introduced, name the exact component responsible, and suggest the fix — turning a fuzzy performance complaint into a compiler-error-shaped problem.

## How It Works

### The dev overlay: named errors with fix cards

An uncached/runtime-API read outside `<Suspense>`, or a random/timestamp value with no cache and no `io()`/`connection()`, surfaces a specific named insight in the dev overlay and dev server console — for example, **`blocking-prerender-dynamic`** for the general case, or **`blocking-prerender-random`** / **`blocking-prerender-current-time`** / **`blocking-prerender-crypto`** for the specific unguarded-value cases from Topic 1. Each names the offending component and the route, and offers concrete fix cards:

- **Stream**: wrap it in (or move it into) `<Suspense>`.
- **Cache**: add `"use cache"` if the value can be shared rather than per-request.
- **Block**: `export const instant = false` to explicitly allow this route to block, deferring the fix (Topic 11).

Crucially: **these insights don't show up in the HTTP response.** A route with an unresolved insight still returns `200` with fully rendered HTML in dev — the insight is only visible in the dev overlay, the terminal log, or via the MCP `get_errors` tool if your editor is wired up for it. This is worth remembering, because it means a route can *look* fine in a quick manual click-through while still failing validation.

### Navigation Inspector: seeing what actually ships

Available in the Next.js DevTools whenever `cacheComponents` is enabled. Toggling **"Pause on navigations"** freezes the page at its initial loading state — a refresh shows the true static shell (fallbacks and all) for a direct page load; a `<Link>` click shows the prefetched destination UI for a client navigation. This answers a different question than validation does: validation tells you *whether* a route is structurally capable of being instant; the inspector shows you *what a user actually sees* in that instant moment, which is how you catch a technically-passing route whose loading state is one giant spinner instead of meaningfully useful content (Topic 1's "maximizing the static shell" is the fix for that specific problem).

Pair it with the **React DevTools Suspense panel**, which lists every `<Suspense>` boundary in the tree and lets you toggle each between its fallback and resolved state — useful for confirming exactly which boundary covers which part of a page.

### Verbose cache logging

Setting `NEXT_PRIVATE_DEBUG_CACHE=1` (for `next dev` or `next start`) turns on detailed logging for cache and ISR behavior generally — useful when a `"use cache"` entry isn't being reused the way you expect, and you need to see what Next.js actually did rather than infer it from response timing (which, as Topic 6's demo showed, can itself be a subtle and misleading signal without deliberately-added delays to make timing differences observable). In development specifically, console logs emitted from inside a cached function are also prefixed with `Cache` when replayed, so you can distinguish "this log came from a fresh execution" from "this log is a replay of a previously-cached run."

### Locking a fix in with `instant()`

Because page loads and client navigations can produce genuinely different initial UI (Topic 2's gotcha — a root-layout Suspense boundary covers a page load but not a client navigation between siblings sharing that layout), passing validation once isn't a permanent guarantee against regression. The `@next/playwright` package's `instant()` helper scopes assertions to exactly the UI available immediately, for both entry paths:

```ts
test('is instant on a client navigation', async ({ page }) => {
  await page.goto('/store/shoes')
  await instant(page, async () => {
    await page.click('a[href="/store/hats"]')
    await page.waitForURL((url) => url.pathname === '/store/hats')
    await expect(page.locator('h1')).toContainText('Baseball Cap')
    await expect(page.getByText('In stock')).toHaveCount(0) // still streaming
  })
  await expect(page.getByText('In stock')).toBeVisible() // resolves after
})
```

Runs against `next dev` automatically; running it in CI against a production build requires `experimental.exposeTestingApiInProductionBuild: true`.

## Common Diagnostic Scenarios

**"My build fails with a validation error I don't recognize."** Read the insight name (`blocking-prerender-*`) — it tells you *which* rule was violated (a general uncached read vs. specifically an unguarded `Math.random()`/`Date.now()`/`crypto.randomUUID()`), which determines which fix card is relevant. A general blocking-prerender-dynamic is fixed with Stream or Cache; a random-value variant specifically needs `io()`/`connection()` (Stream) or moving the value inside a `"use cache"` scope (Cache) — wrapping in bare `<Suspense>` alone doesn't fix an unguarded `Math.random()` call, since the value still executes during prerendering unless `io()`/`connection()` explicitly defers it to request time first.

**"This route was cached; now it's recomputing every request, and I didn't change its `cacheLife`."** Check whether you're on a serverless deployment with the default in-memory handler (Topic 5's gotcha) — a fresh instance per request means the entry may simply not be there to reuse, independent of whether its lifetime has actually elapsed. `NEXT_PRIVATE_DEBUG_CACHE=1` will confirm whether it's a genuine miss or a cache-fill.

**"I called `revalidateTag`, but the page still shows old data on the very next load."** This may be entirely correct — `revalidateTag` (unlike `updateTag`) is stale-while-revalidate by design: the request right after calling it can still legitimately serve the old value while a fresh copy regenerates in the background (Topic 7). If immediate consistency was actually required, the fix is switching that call site to `updateTag`, not treating this as a bug.

**"A route passes validation on refresh but still feels slow when I click into it from another page."** Test the client-navigation path specifically, not just direct visits — a `<Suspense>` boundary in a root layout covers page loads but not navigations between siblings sharing that layout (Topic 2). The Navigation Inspector's "Client nav" mode and an `instant()` test targeting a click-through (not `page.goto()`) are what actually exercise this path.

**"My route shows `○` (fully static) in the build output, but I expected it to be dynamic/partially prerendered."** This usually means something you assumed would force dynamism — a plain `await new Promise(setTimeout)`, a database call with no `fetch`/runtime API involved — is actually a "predictable" or fully-resolvable synchronous-feeling operation from prerendering's perspective, and got baked into the static shell at build time (Topic 1's gotcha, and the exact bug this repo hit while building Topic 3's and Topic 4's demos — both counters initially rendered `○` and had to be forced dynamic with `headers()`/`io()`).

## Interview Questions

**Q (High): A teammate says "the build is failing with some Cache Components error, I don't understand it." What's your systematic approach to diagnosing it?**

Answer: Read the specific insight name first — `blocking-prerender-dynamic` (a general uncached/runtime read outside Suspense) and the `blocking-prerender-random`/`-current-time`/`-crypto` variants (an unguarded non-deterministic value) point at different root causes and different fixes, even though both fail with a similar-looking message. The insight names the exact component and route, so the next step is opening that component and checking which category (Topic 1's four buckets) it actually falls into — then applying the matching fix card: wrap in `<Suspense>` if it should stream, add `"use cache"` if it should be shared, or `instant = false` if the fix genuinely needs to wait for later work.

The trap: treating every Cache Components build error as the same generic problem and reaching for `<Suspense>` reflexively — an unguarded `Math.random()` call needs `io()`/`connection()` specifically, not just a Suspense wrapper, since the value would otherwise still execute during prerendering.

**Q (High): You call `revalidateTag('posts', 'max')` after a mutation, then immediately re-fetch the same page and still see the old data. Is this a bug?**

Answer: Not necessarily — this is `revalidateTag`'s documented stale-while-revalidate behavior. The `'max'` profile deliberately serves the current (about-to-be-stale) cached value on the next request while regenerating in the background, rather than blocking for freshness. If the scenario actually requires the user to see their own change immediately, the correct fix is switching to `updateTag` (Server Actions only) for that specific mutation, not debugging `revalidateTag` as broken.

The trap: assuming any "old data after invalidation" symptom is automatically a bug, without first checking which of the two invalidation functions was used and what guarantee it actually makes.

**Q (Medium): A route shows `○` (fully static) in `next build` output, but you added a `setTimeout`-based delay inside one of its data-fetching functions expecting it to force dynamic rendering. Why didn't it work?**

Answer: A plain asynchronous delay with no `fetch`, no runtime API (`cookies`/`headers`/`searchParams`), and no explicit `io()`/`connection()` call doesn't register as "dynamic" to Cache Components' prerendering pass — it's awaited and resolved during the build like any other async work that doesn't touch a recognized dynamic source, and its result gets baked into the static shell. Forcing genuinely per-request behavior requires an explicit signal: a Request-time API read, or `io()`/`connection()` called before the non-deterministic part.

The trap: assuming "it's async" or "it has a delay" is sufficient to make something dynamic — dynamism is about *what* is accessed (a request-time or explicitly-marked source), not how long a function takes or whether it's `async`.

**Q (Medium): Why does the Navigation Inspector matter if a route already passes Cache Components' build-time validation?**

Answer: Validation confirms a route is *structurally capable* of being instant — that nothing blocks it from producing a static shell. It says nothing about whether that shell is actually *useful* content versus a single full-page spinner covering everything. The Navigation Inspector lets you see the literal initial UI a user gets, for both page loads and client navigations, which is how you catch a passing-but-poorly-structured route and apply Topic 1's "maximize the static shell" pattern to push `<Suspense>` boundaries down closer to the actual dynamic data.

The trap: treating "the build passed" as equivalent to "the loading experience is good" — they're related but genuinely separate checks.

**Q (Low): Why don't Cache Components validation insights appear in the HTTP response, even for a route that fails validation?**

Answer: A route with an unresolved insight still returns a normal `200` response with fully-rendered HTML in development — the insight is purely a developer-facing signal (dev overlay, terminal log, or the MCP `get_errors` tool), not something that alters the actual response. This means a quick manual click-through of a route in a browser can look completely fine while the route is still failing validation underneath, which is exactly why relying on the dev overlay (or the `next build` validation step, which does fail the build) matters more than eyeballing the rendered page.

The trap: assuming "it looks right in the browser" is sufficient evidence a route is correctly structured — validation issues are specifically the kind of problem that doesn't show up that way.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can name the three fix-card categories (Stream / Cache / Block) and when each applies
- [ ] Can explain why an unguarded `Math.random()` needs `io()`/`connection()` specifically, not just `<Suspense>`
- [ ] Can explain why "old data after `revalidateTag`" is often expected behavior, not a bug
- [ ] Can explain why a route can show `○` even with an async delay inside it
- [ ] Can explain what the Navigation Inspector checks that build-time validation doesn't

---

## Phase 3 Complete

This phase covered Next.js 16's Cache Components model end to end: the rendering philosophy (Topics 1–2), the two memoization primitives (Topics 3–4), the caching directive and its two revalidation modes (Topics 5–7), dynamic-segment prerendering and ISR (Topics 8–9), the client-side half of "instant" (Topic 10), how this maps onto pre-16 code (Topic 11), and how to diagnose it when something's wrong (this topic). Every live-demo claim in Topics 1–9 was verified against a running server, not just written from documentation.

*Next: Phase 4 — Server Components & Data Fetching, which builds on this phase's caching model to cover the server/client boundary itself: what runs where, how data crosses it, and the antipatterns interviewers specifically probe for.*
