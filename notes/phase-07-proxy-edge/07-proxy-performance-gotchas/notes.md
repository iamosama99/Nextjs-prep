# Proxy Performance & Execution-Order Gotchas

**Demo:** `proxy-logic/topic-07-performance.ts`. Two documented claims verified directly rather than
trusted: a Server Action's compiled POST was confirmed reaching proxy just like any other request to that
path, and `fetch()`'s `next: { revalidate: 60 }` was confirmed to have **no effect** inside proxy — two
consecutive requests returned two different UUIDs despite the requested 60-second cache window.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| The documented 8-step execution order | Headers/redirects from `next.config.js` → Proxy → rewrites → filesystem routes → dynamic routes → fallback | Proxy runs early — before the filesystem even resolves what's being requested |
| A Server Action's compiled POST | A request to the **same path** as the page that defines it | Verified: proxy sees it exactly like any other request to that path — no special-casing |
| `fetch()` with `next: { revalidate }` inside proxy | Has **no effect** — verified directly | Proxy isn't meant for cacheable data fetching; every fetch inside it is effectively uncached |
| `_next/data` under a negative `matcher` | Still invoked regardless — documented, deliberate exception | Prevents "protected the page, forgot the data route" security gaps |

## Where Does This Run?

Proxy, at a specific, early position in a documented, ordered pipeline — this topic is about that position and what it implies for both correctness (execution order) and performance (what proxy should and shouldn't do given how often it runs).

## What Is This?

Two related concerns that both stem from proxy's position ahead of normal routing: **where exactly** it sits relative to `next.config.js` behavior and the filesystem router (execution order), and **what it costs** to do expensive work there, given it potentially runs on every single request a project serves, including ones a developer might not expect (Server Action calls, prefetches).

> **Check yourself:** Does a Server Action's network call reach proxy the same way a normal page navigation does, or does it bypass proxy as an internal mechanism?

## Why Does It Exist?

Proxy's entire value proposition — intercepting a request before any routing decision is made — is also exactly what makes misusing it expensive: anything slow placed there adds latency to *every* matched request, not just the ones that actually needed that work done. The docs are blunt about this: "Proxy is *not* intended for slow data fetching." Execution order matters for a related but distinct reason — knowing precisely what's already happened (and what hasn't) by the time proxy's code runs is what makes redirects, rewrites, and header decisions there predictable rather than accidental.

## How It Works

### The documented execution order

For every request, in order: `headers` from `next.config.js`, `redirects` from `next.config.js`, **Proxy**, `beforeFiles` rewrites, filesystem routes (`public/`, `_next/static/`, `app/`), `afterFiles` rewrites, dynamic routes, then `fallback` rewrites. The practical upshot already exploited throughout this phase's demos: proxy runs before the filesystem router has resolved anything, which is exactly why Topic 2's redirect/rewrite sources needed no `page.tsx` of their own — proxy's decision happens before that resolution step would even occur.

### Server Actions ride the same pipeline, verified directly

The docs state plainly: "Server Functions are not separate routes in this chain. They are handled as POST requests to the route where they are used" — meaning a Server Action's compiled call isn't some internal, proxy-bypassing mechanism; it's an ordinary POST to whatever page path defined it, going through the exact same pipeline as any other request. This topic's demo confirms it concretely: [`action-demo/page.tsx`](../../../app/playground/phase-07-proxy-edge/07-proxy-performance-gotchas/action-demo/page.tsx) defines an inline Server Action, and a raw POST to that page's own path — built from the real hidden `$ACTION_ID_` field the page renders, the same technique Phase 5 used throughout — returned `x-proxy-saw-post-to-page-route: true`, a header [`topic-07-performance.ts`](../../../proxy-logic/topic-07-performance.ts) only sets for POST requests to that exact path. Proxy didn't need to know anything about Server Actions specifically; it just saw a POST to a path its matcher covers, exactly like any other request.

The consequence the docs flag directly: **a matcher that excludes a path also silently excludes any Server Action defined on that path.** A refactor that moves a form (and its Server Action) to a route outside proxy's matcher removes that action from proxy's coverage with no error, no warning — just a silent gap. Given Phase 5 Topic 7's lesson (a page-level check doesn't protect a Server Action's own entry point), this makes proxy-based coverage of Server Actions doubly fragile: it depends on the action's *page path* staying inside the matcher, a fact easy to break by refactoring the page without touching the matcher at all.

### `fetch()` caching genuinely does nothing in proxy — verified, not assumed

The docs state: "Using fetch with `options.cache`, `options.next.revalidate`, or `options.next.tags`, has no effect in Proxy." This topic's demo tests it directly rather than repeating the claim: [`fetch-cache-check/page.tsx`](../../../app/playground/phase-07-proxy-edge/07-proxy-performance-gotchas/fetch-cache-check/page.tsx) triggers a proxy-side `fetch()` with `next: { revalidate: 60 }` against a Route Handler returning a fresh UUID on every call. Two consecutive requests, seconds apart, returned two genuinely different UUIDs — if the requested 60-second revalidate window had any effect, the second request should have received the cached (identical) value from the first. It didn't. Every `fetch()` proxy performs is, in practice, an uncached network call, regardless of what cache options are passed — directly reinforcing why proxy shouldn't be the place for anything resembling real data fetching.

### `_next/data` is a deliberate exception to negative matching

Even when a negative-lookahead `matcher` pattern explicitly excludes `_next/data`, the docs state proxy still runs for `_next/data` routes anyway — called out as intentional, specifically to prevent the security gap of protecting a page's HTML but forgetting its corresponding client-side data-fetching route, which would otherwise leak the same data through a side door.

## Gotchas

- **Moving a Server Action to a new page path can silently drop it from proxy's coverage** — no error, no warning, just a matcher that no longer happens to include the new location. Given how central proxy-based auth gating is (Topic 3), this is a genuinely dangerous, easy-to-introduce regression during a routine refactor.
- **Any `fetch()` inside proxy should be assumed uncached, full stop** — verified directly, not merely documented. Reaching for proxy to do "a quick cached lookup" produces a slow, uncached lookup on every single matched request instead.
- **`_next/data` always runs through proxy even when explicitly excluded** — a negative matcher pattern that looks like it excludes internal Next.js routes doesn't fully exclude this one, by design.
- **Every step before Proxy in the execution order (`next.config.js` headers/redirects) has already happened by the time proxy's code runs** — a redirect defined in `next.config.js` for a path proxy also has logic for means the config-level redirect wins; proxy's code for that path never executes at all.

## Interview Questions

**Q (High): If a proxy's `matcher` doesn't cover the path where a particular Server Action's form lives, is that Server Action still protected by whatever auth logic the proxy applies to other paths?**

Answer: No — verified directly that a Server Action's compiled call is an ordinary POST to the exact page path that defines it, going through the same matcher-based coverage as any other request. If that path falls outside the matcher, the Server Action is simply never seen by proxy at all, with no error or warning. This is exactly the failure mode the docs warn about: a refactor that relocates a form to a new route silently removes proxy's coverage of its action, without anyone necessarily noticing.

The trap: assuming Server Actions are some special, proxy-aware internal mechanism rather than recognizing they're indistinguishable from any other POST to their defining page's path.

**Q (High): Does calling `fetch(url, { next: { revalidate: 60 } })` inside proxy actually cache the response for 60 seconds?**

Answer: No — verified directly. Two consecutive requests through a proxy-side fetch with that exact option returned two different values from an endpoint designed to return a fresh one each call. The docs state this plainly ("has no effect in Proxy"), and this topic's demo confirms it rather than assuming it: every fetch inside proxy behaves as if uncached, regardless of what cache-related options are passed.

The trap: assuming Next.js's fetch caching semantics apply uniformly everywhere fetch is called from — they don't; proxy is a specific, documented exception.

**Q (Medium): Where does Proxy sit in Next.js's request-handling pipeline relative to `next.config.js` redirects and the filesystem router?**

Answer: After `next.config.js`'s own `headers` and `redirects` (which run first and, if they match, proxy's logic for that same path never executes), but before the filesystem router resolves `beforeFiles` rewrites, static/dynamic routes, or `afterFiles`/`fallback` rewrites. Proxy runs early enough that it doesn't need a page to already exist at whatever path it redirects or rewrites from — confirmed throughout this phase's earlier demos.

The trap: assuming proxy runs "somewhere in the middle" without being able to place it precisely relative to the two `next.config.js` stages that come before it.

**Q (Medium): Why does proxy still run for `_next/data` requests even when a negative `matcher` pattern appears to exclude them?**

Answer: It's a deliberate, documented exception specifically to prevent a common security gap: a developer excludes internal-looking paths from proxy for convenience, inadvertently also excluding the client-side data-fetching route that serves the same data the (correctly-protected) page renders — leaking that data through a side door that never got the same protection.

The trap: assuming a broad negative-lookahead matcher pattern excludes everything it appears to name, without knowing about this specific, intentional carve-out.

**Q (Low): A `next.config.js` `redirects()` entry and a proxy's own logic both apply to the same path, with conflicting behavior. Which one wins?**

Answer: The `next.config.js` redirect — it runs earlier in the documented execution order (step 2, versus proxy at step 3), so by the time proxy's function would execute for that path, the request has already been redirected and proxy's code for it never runs at all.

The trap: assuming proxy, as the more "powerful" or more specific mechanism, takes precedence — execution order is determined by pipeline position, not by which mechanism seems more capable.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can recite Proxy's position in the execution order relative to `next.config.js` headers/redirects and the filesystem router
- [ ] Can explain why a Server Action's proxy coverage depends entirely on its defining page's path being in the matcher
- [ ] Can state, with justification, that fetch() cache options have no effect in proxy
- [ ] Knows `_next/data` is a deliberate exception to negative matcher exclusion, and why
- [ ] Can determine which of two conflicting redirect mechanisms (config-level vs. proxy) wins for the same path

---
*This completes Phase 7 — Proxy (formerly Middleware) & the Edge Runtime. Phase 8 (Metadata, SEO & Assets) moves to a different corner of the App Router: the Metadata API, sitemaps/robots, and next/image/next/font — none of which depend on anything this phase covered.*
