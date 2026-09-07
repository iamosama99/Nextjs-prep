# Request Memoization

**Demo:** `app/playground/phase-03-rendering-caching/03-request-memoization` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/03-request-memoization`, and refresh a few times.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| Two components both call `fetch(sameUrl)` in one render | Next.js runs the request once and shares the result | No need to hoist data-fetching to a common ancestor and prop-drill |
| Memoization | Scoped to a single render pass (one request) | Not the same thing as persistent caching (Topic 5) — it doesn't survive to the next request |
| `fetch` with an `AbortController` signal | Opts that call out of memoization | Rare — most code wants the dedupe |
| Same `fetch` called from a Route Handler | **Not** memoized | Route Handlers aren't part of the React component tree |

## Where Does This Run?

Server, during a single render pass — meaning the work of rendering one request's component tree from top to bottom. Memoization only exists for the lifetime of that one render; it does not persist to the next request the way the caching in Topics 5–7 does.

## What Is This?

If two different components in the same route both need the same data — say, a `Header` showing the logged-in user's name and a `Sidebar` showing their avatar — the naive approach is fetching it once high up and passing it down as props through every intermediate component that doesn't otherwise need it. Next.js removes that trade-off for `fetch`: identical `GET` requests (same URL, same options) made anywhere in the same render — different Server Components, layouts, pages, even `generateStaticParams` and `generateMetadata` — are automatically deduplicated. The first call actually hits the network; every other identical call during that same render reuses its result instead of firing a second request.

> **Check yourself:** Two sibling Server Components both call `fetch('https://api.example.com/user')` with no special options. How many actual network requests does that produce in a single render? What if a third call adds `{ signal }` from a fresh `AbortController`?

## Why Does It Exist?

Without this, colocating a `fetch` call in the component that actually needs the data (the pattern React and Next.js otherwise encourage — "fetch where you use it," not "fetch at the top and drill props") would mean redundant network calls anywhere two components happen to want the same thing. Memoization makes "just call `fetch` again" a safe default instead of a performance trap, which is what lets you write components that are self-sufficient rather than dependent on a parent handing them the right props.

## How It Works

Memoization keys on the `fetch` call's URL, method, headers, and body — an exact match reuses the in-flight or resolved result; anything different (even a different header) is a separate request. It's implemented via React's own request-scoped memoization mechanism (the same primitive `React.cache` uses — Topic 4), which is why it resets at the start of every new render and never leaks between requests. Passing an `AbortController` signal deliberately opts a call out, since an aborted request shouldn't be silently reused elsewhere.

The demo for this topic proves it directly: an internal Route Handler increments an in-memory counter on every hit and returns the current value. Two sibling components on the same page both `fetch` that same URL. If memoization is working, both show the *same* number on a given page load — and that number only goes up by **one** per full page refresh, not two, even though two components each called `fetch`.

```tsx
// Both call the same URL — but only one real request happens per render
async function CounterA() {
  const res = await fetch(counterUrl)
  const { count } = await res.json()
  return <p>A sees: {count}</p>
}
async function CounterB() {
  const res = await fetch(counterUrl)
  const { count } = await res.json()
  return <p>B sees: {count}</p>
}
```

> **Check yourself:** The demo's counter goes up by exactly one per refresh, not two. If Request Memoization were *not* happening, what would you expect to see instead, and why?

## Gotchas

- **This is not persistent caching.** A memoized `fetch` result is shared *within* one render and thrown away afterward. The very next request re-runs everything from scratch (unless something is *also* wrapped in `"use cache"` — Topic 5, a separate and orthogonal mechanism).
- **Route Handlers are excluded.** They aren't part of the React component tree Next.js is rendering, so `fetch` calls inside a Route Handler are never deduplicated against each other or against calls made elsewhere.
- **Only `GET` requests with matching options dedupe.** Change a header, a body, or the method, and it's a distinct call, deliberately — Next.js can't safely assume two differently-configured requests want the same answer.
- **Non-`fetch` data sources get none of this for free.** A direct ORM/database call has no automatic memoization — that's what React's `cache()` function (Topic 4) is for.

## Interview Questions

**Q (High): Two Server Components in the same route both call `fetch()` on the same URL with no special options. Does this cost two network requests? Why does Next.js do this?**

Answer: No — it costs one. Next.js automatically memoizes identical `GET fetch` calls (same URL, method, headers, body) within a single render pass, so the second call reuses the first's in-flight or resolved result. This exists so components can fetch their own data independently — "fetch where you use it" — without a performance penalty for two components legitimately wanting the same thing, removing the need to hoist fetching to a shared ancestor and prop-drill the result down.

The trap: candidates sometimes confuse this with persistent caching (`force-cache`, `"use cache"`). Memoization is scoped to one render/request and provides zero benefit across requests — it's a different mechanism solving a different problem.

**Q (Medium): Why are `fetch` calls inside Route Handlers excluded from Request Memoization?**

Answer: Memoization piggybacks on React's per-request rendering pass through the component tree — it's implemented as part of rendering Server Components, layouts, and pages. Route Handlers aren't rendered as part of that React tree; they're plain request handlers, so there's no render pass for the memoization to scope itself to.

The trap: assuming "server-side" is the qualifying condition. It's specifically "part of the React component tree render," not merely "runs on the server."

**Q (Medium): How would you deliberately opt a specific `fetch` call out of Request Memoization?**

Answer: Pass a `signal` from an `AbortController` in the `fetch` options. Since an aborted request's outcome shouldn't be assumed reusable elsewhere, adding a signal marks that call as distinct and excludes it from the automatic dedupe.

The trap: not knowing this exists at all, or confusing it with cache-control options (`cache: 'no-store'`) — that's a different axis (persistent caching, Topic 5's territory), not memoization.

**Q (Low): Does Request Memoization apply to database/ORM calls the same way it applies to `fetch`?**

Answer: No — Request Memoization is a `fetch`-specific feature. A raw database call made twice in the same render fires twice, full stop. Getting the equivalent dedupe behavior for non-`fetch` sources requires explicitly wrapping the function in React's `cache()` (Topic 4), which is the same underlying primitive but requires opt-in.

The trap: assuming "memoization" is some ambient property of Server Component rendering rather than something specific to how `fetch` was extended.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain in one sentence why two components can independently `fetch` the same URL without a performance penalty
- [ ] Can name what `fetch` options must match for two calls to be deduplicated
- [ ] Can explain the difference between Request Memoization and persistent caching (`"use cache"`)
- [ ] Can explain why Route Handlers don't get automatic `fetch` deduplication
- [ ] Can name how to opt a `fetch` call out of memoization

---
*Next: React's `cache()` — the same dedupe idea, generalized to any async function, not just `fetch`.*
