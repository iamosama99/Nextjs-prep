# `<Suspense>` as the Dynamic Boundary

**Demo:** `app/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary`, then click the theme links.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `cookies()`, `headers()`, `searchParams`, `draftMode()` | The **Request-time APIs** — data that only exists once a real request arrives | Reading one, anywhere, requires a `<Suspense>` boundary under Cache Components |
| The same read, wrapped in `<Suspense>` | A hole in the static shell | Fallback ships in the shell; the real value streams in at request time |
| The same read, **not** wrapped | A build error (`blocking-prerender-runtime` / `blocking-prerender-dynamic`) | Cache Components refuses to guess whether you meant "cache it" or "stream it" |
| A layout reading `cookies()` above a `loading.tsx` | Still blocks navigation | `loading.tsx` wraps the **page**, not layouts above it — see Gotchas |

## Where Does This Run?

Request time, on the server — this topic is a close-up on category 3 of the four prerendering buckets from Topic 1 (`<Suspense>` boundaries). Everything here is about the specific case where what's inside the boundary is one of the **Request-time APIs**: data that is only known once an actual HTTP request lands on the server, as opposed to an uncached `fetch` to some external resource.

## What Is This?

You already know `<Suspense>` from React: it lets part of a tree resolve independently and shows fallback UI while it does. Next.js's Request-time APIs — `cookies()`, `headers()`, `searchParams`, and `draftMode()` — are the small, closed set of functions that read something about *this specific request* rather than an external data source. Under Cache Components, reading any of them behaves exactly like an uncached `fetch`: it's dynamic, it suspends, and it needs a `<Suspense>` boundary somewhere above it. The distinction between "runtime API" and "uncached fetch" mostly matters for *why* something is dynamic (there's genuinely no way to know a cookie's value before the request exists — unlike a slow API response, which is dynamic by choice, not necessity).

> **Check yourself:** Without looking, name the four Request-time APIs and explain in one sentence why none of them can ever be a "predictable value" (Topic 1's category 1), no matter how the code is structured.

## Why Does It Exist?

Before Cache Components, reading `cookies()` or `headers()` *anywhere* in a route's component tree — a layout, a deeply nested component, didn't matter — silently opted the **entire route** into dynamic rendering. One line reading a "logged in as" cookie in the root layout made every page in the app dynamic, whether or not that page's own content needed to be.

```tsx
// Before (pre-16): this alone makes the WHOLE route dynamic
import { cookies } from 'next/headers'

export default async function Page() {
  const theme = (await cookies()).get('theme')?.value
  return <Dashboard theme={theme} />
}
```

```tsx
// After (Cache Components): only <Dashboard> is dynamic; everything else prerenders
import { cookies } from 'next/headers'
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Dashboard />
    </Suspense>
  )
}

async function Dashboard() {
  const theme = (await cookies()).get('theme')?.value
  // ...
}
```

Same data, same API — but moving the read into a `<Suspense>`-wrapped leaf component means the rest of the page (nav, footer, static marketing copy) prerenders normally. This is the direct, concrete payoff of Topic 1's "spectrum" idea: a `Suspense` boundary is *where* you draw the line between shell and stream, and Request-time APIs are the most common reason to draw one.

## How It Works

### The validation, not a lint suggestion

Cache Components validates this during `next dev` and `next build`. An unguarded runtime-API read surfaces the **blocking-prerender-runtime** insight in the dev overlay (or fails the build outright), naming the exact component and offering the fix: wrap it in `<Suspense>`, or, if the value can be shared across users instead of being per-request, extract it and pass it to a `"use cache"` function instead (Topic 5).

### `loading.tsx` doesn't cover what you'd expect

`loading.tsx` automatically wraps `page.tsx` (and everything below it) in a `<Suspense>` boundary — but only at that segment. If a **layout** above the page reads uncached or runtime data, `loading.tsx` doesn't help: the layout isn't inside the boundary `loading.tsx` creates, so navigation blocks until the layout itself finishes rendering.

```
app/dashboard/layout.tsx   ← reads cookies() directly — NOT covered by loading.tsx below
app/dashboard/loading.tsx  ← only wraps page.tsx
app/dashboard/page.tsx
```

The fix is the same principle as always: wrap the uncached/runtime access in its own `<Suspense>` boundary right where it happens, or move the data access down into `page.tsx` where `loading.tsx` can cover it. This is why Next.js's own docs recommend placing `<Suspense>` close to the actual data access rather than relying on `loading.tsx` alone once a layout is involved.

### Passing runtime values into a cached function

A common shape: you need a per-user value (a session ID from a cookie) to look up data you'd like to *cache* per-user. You can't read `cookies()` inside a `"use cache"` scope (Topic 5 covers why), so the pattern is to read the runtime value **outside** the cache boundary, in an uncached `<Suspense>`-wrapped component, and pass it as an argument into the cached function:

```tsx
async function ProfileContent() {
  const session = (await cookies()).get('session')?.value  // uncached, runtime
  return <CachedContent sessionId={session} />
}

async function CachedContent({ sessionId }: { sessionId: string }) {
  'use cache'                                                // sessionId is now part of the cache key
  const data = await fetchUserData(sessionId)
  return <div>{data}</div>
}
```

`sessionId` becomes part of `CachedContent`'s cache key, so different sessions get separate cache entries, while `CachedContent` itself stays a normal, cacheable function — it just never touches `cookies()` directly.

> **Check yourself:** A layout reads `headers()` at its top level, and the page below it has a `loading.tsx` file. Does `loading.tsx` prevent this route from blocking on the layout's `headers()` read? Why not?

## Gotchas

- **Page load vs. client navigation see different Suspense coverage.** A `<Suspense>` boundary in the root layout catches everything on a direct page load (the whole tree renders from the root). On a client-side navigation between sibling routes, only the segments below the shared layout re-render — a boundary that sits *above* that shared layout never triggers, because it's not part of the re-render. A route can pass every "does this load instantly" check for direct visits and still block on client navigation. (Topic 10 and Topic 12 cover the tooling for catching this.)
- **`<Suspense>` doesn't grant permission — it just catches what suspends.** Wrapping something in `<Suspense>` that doesn't actually read a runtime API or uncached data does nothing; it still completes during prerendering and ships in the shell (same rule as Topic 1).
- **`searchParams` always needs a boundary**, even more strictly than `cookies()`/`headers()` — a URL's query string is never known at build time, full stop, so any read of it (directly or via `useSearchParams()` in a Client Component) suspends.

## Interview Questions

**Q (High): Before Next.js 16, reading `cookies()` in a layout made the whole route dynamic. What changed, and what's the mechanism now?**

Answer: Under Cache Components, a Request-time API read is scoped to the component that reads it, not the route. If that component sits inside a `<Suspense>` boundary, only it becomes a dynamic hole — everything else in the route, including sibling components and ancestor layouts, still prerenders into the static shell. The read itself didn't change; what changed is that Next.js now requires (and enforces via build validation) an explicit `<Suspense>` boundary around it, rather than silently propagating dynamism to the whole route.

The trap: candidates sometimes describe this as "cookies() is cached now" — it isn't; it's exactly as dynamic as before. What changed is the *blast radius* of that dynamism.

**Q (High): A `page.tsx` has a sibling `loading.tsx`, but the route still blocks on navigation. What's the likely cause?**

Answer: `loading.tsx` only wraps `page.tsx` in a `<Suspense>` boundary — it does not cover layouts above that page segment. If a layout reads `cookies()`, `headers()`, or does an uncached fetch directly, that read sits outside the boundary `loading.tsx` creates, so the layout blocks navigation regardless of `loading.tsx`. The fix is to wrap the layout's own uncached access in its own `<Suspense>`, or move the data access into the page.

The trap: assuming `loading.tsx` is a route-wide catch-all. It's scoped to one segment, same as any other Suspense boundary.

**Q (Medium): Why can a route pass build-time validation for direct visits but still block on a client-side navigation?**

Answer: A direct page load renders the entire tree from the document root, so a `<Suspense>` boundary anywhere above the dynamic read — including in the root layout — catches it. A client-side navigation between two routes that share a layout only re-renders the segments *below* that shared layout; a boundary sitting above the shared layout was never part of that re-render to begin with. The same code can therefore be instant on a hard refresh and blocking on a soft navigation between siblings.

The trap: testing only via full page reloads during development gives a false sense that a route is fully "instant" — client navigation needs to be checked separately (Topic 12 covers the tooling that does this automatically).

**Q (Medium): Why can't you read `cookies()` directly inside a `"use cache"` function, and what's the recommended workaround?**

Answer: A cached function's output is meant to be reused across requests (and potentially across users), so it can't depend on request-specific data captured inside its own execution — Next.js enforces this by throwing if a cached function (or anything it calls) reads a runtime API. The fix is to read the value in an uncached, `<Suspense>`-wrapped component outside the cache scope, then pass it into the cached function as an argument, where it becomes part of that function's cache key.

The trap: reaching for `"use cache: private"` (a real but narrower escape hatch, covered alongside Topic 5) as the default answer instead of the simpler "extract and pass as an argument" pattern, which is what Next.js recommends first.

**Q (Low): Is `searchParams` treated any differently from `cookies()`/`headers()` under Cache Components?**

Answer: All four Request-time APIs require a `<Suspense>` boundary, but `searchParams` (and the client hook `useSearchParams()`) has no exception — a URL's query string genuinely cannot exist before a specific request, whereas `cookies()`/`headers()` reads at least have narrower workarounds like `"use cache: private"` for compliance-driven cases. In practice, treat all four the same: read them behind Suspense, or pass extracted values into a cached function.

The trap: assuming there's a caching escape hatch for `searchParams` equivalent to what exists for cookies/headers — there isn't, by design, since URL data varies per link, not per session.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can name all four Request-time APIs
- [ ] Can explain why reading `cookies()` in a layout no longer makes the whole route dynamic
- [ ] Can explain why `loading.tsx` doesn't protect against a layout's own uncached reads
- [ ] Can write the "extract and pass as an argument" pattern for getting a runtime value into a cached function
- [ ] Can explain why the same route can pass validation on page load but block on client navigation

---
*Next: Request Memoization — now that you know where dynamic reads live, the next question is what happens when the same data is read more than once in a single render pass.*
