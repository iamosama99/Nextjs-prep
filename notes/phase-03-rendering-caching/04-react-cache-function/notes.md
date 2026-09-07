# React's `cache()` — Per-Request Memoization for Non-`fetch` Data

**Demo:** `app/playground/phase-03-rendering-caching/04-react-cache-function` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/04-react-cache-function`, and refresh a few times.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `const getUser = cache(async (id) => {...})` | Wraps any async function with the same per-render dedupe `fetch` gets automatically | The tool for ORM/database calls, since they don't get Topic 3's dedupe for free |
| Two components calling `getUser('42')` in one render | Runs the underlying function once, shares the result | Same payoff as Topic 3, generalized beyond `fetch` |
| `React.cache` used inside a `"use cache"` scope | Isolated — sees none of the outer scope's cached values | A real trap; covered in Gotchas |
| `React.cache` across two different requests | Not shared | Scoped to one render, same as `fetch` memoization — never a persistence mechanism |

## Where Does This Run?

Server, during a single render pass — exactly the same scope as Topic 3's `fetch` memoization. `React.cache` is, in fact, the same underlying request-scoped mechanism `fetch` memoization is built on; the difference is that `fetch` gets it automatically, and everything else needs an explicit `cache()` wrap.

## What Is This?

Topic 3 showed that identical `fetch` calls anywhere in one render pass are deduplicated for you. That's a `fetch`-specific behavior — a raw database query, an ORM call, or any other async function gets no such treatment on its own. `React.cache()` closes that gap: wrap any async function in it, and repeated calls with the same arguments during a single render return the same promise/result instead of re-running the function.

```ts
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  return db.query.users.findFirst({ where: eq(users.id, id) })
})
```

Any Server Component that imports and calls `getUser('42')` shares one execution with every other component in the same render that also calls `getUser('42')` — no prop drilling required.

> **Check yourself:** Without looking, explain in one sentence why `React.cache` is necessary at all, given that Topic 3 already showed `fetch` gets deduplication automatically.

## Why Does It Exist?

The same motivation as Topic 3, just generalized: components should be free to fetch their own data independently, wherever they sit in the tree, without a developer having to manually hoist a query to a shared ancestor to avoid running it twice. `fetch` got this behavior baked in because Next.js could intercept it directly. For everything else — direct database drivers, third-party SDKs, expensive pure computations — React exposes the same primitive as a public API so library and application code can opt in explicitly.

## How It Works

`cache()` keys on the function's identity plus its arguments (compared essentially by reference/value, similar to how memoization normally works) — call it again with the same arguments during the same render, and you get back the already-resolved (or in-flight) result rather than a fresh invocation. The scope is a single request: a new render for the next request gets a completely fresh cache, exactly like `fetch` memoization.

```tsx
import { cache } from 'react'

let dbCallCount = 0

const getUser = cache(async (id: string) => {
  dbCallCount += 1
  return { id, name: 'Ada Lovelace', dbCallCount }
})

async function ProfileHeader({ id }: { id: string }) {
  const user = await getUser(id)
  return <p>Header sees dbCallCount = {user.dbCallCount}</p>
}

async function ProfileSidebar({ id }: { id: string }) {
  const user = await getUser(id) // same id — reuses ProfileHeader's call
  return <p>Sidebar sees dbCallCount = {user.dbCallCount}</p>
}
```

Both components read the *same* `dbCallCount`, because the second `getUser('42')` call never actually re-executes the function body — it just receives the first call's already-in-flight result. The demo for this topic mirrors this exactly, using [`io()`](/docs/app/api-reference/functions/io) (from Topic 1) to force the function to run at request time rather than being folded into the static shell at build time, so you can watch the shared counter climb by exactly one per real page load.

### Reusing data across `generateMetadata` and a page

A common real use: the same lookup (say, a blog post by slug) is needed both by `generateMetadata` (for the page `<title>`) and by the page component itself. Wrapping the fetch function in `cache()` means both call sites share one query instead of hitting the database twice for the same request.

## Gotchas

- **`React.cache` is isolated inside a `"use cache"` boundary.** Values stored via `React.cache` *outside* a `"use cache"` function are invisible from *inside* it — `"use cache"` runs its own separate `React.cache` scope. This means you cannot use `React.cache` as a way to smuggle data into a cached function; use a function argument instead (same rule Topic 2 covered for runtime values).

  ```tsx
  const store = cache(() => ({ current: null as string | null }))

  function Parent() {
    store().current = 'value from parent'
    return <Child />
  }

  async function Child() {
    'use cache'
    const shared = store()
    // shared.current is null here — "use cache" has its own isolated scope
  }
  ```

- **It's still per-request, not persistent.** The same trap as Topic 3: don't reach for `React.cache` expecting it to survive across requests. If you need that, you want `"use cache"` (Topic 5).
- **Arguments matter for the cache key.** Calling `getUser('42')` and `getUser('43')` are different entries — only identical arguments hit the same cached result.

## Interview Questions

**Q (High): You have a direct database call (no `fetch`) needed by both a layout and a page in the same route. How do you avoid running the query twice, and why doesn't Topic 3's automatic memoization help here?**

Answer: Wrap the query function in React's `cache()`. Topic 3's automatic deduplication is specific to `fetch` — Next.js can intercept and dedupe `fetch` calls because it controls that API's implementation, but it has no equivalent hook into arbitrary async functions like a raw ORM call. `React.cache()` is the general-purpose version of the same idea: wrap any async function, and repeated calls with matching arguments in one render share a result instead of re-executing.

The trap: assuming Next.js's fetch memoization is some ambient Server Component behavior that "just applies" to all async code — it doesn't; only `fetch` gets it automatically.

**Q (Medium): Why does a value stored via `React.cache` outside a `"use cache"` function come back empty when read from inside that cached function?**

Answer: `"use cache"` boundaries run in their own isolated `React.cache` scope, separate from the surrounding render's scope. This is intentional: it keeps a cached function's behavior self-contained and predictable — its output shouldn't silently depend on ambient state set elsewhere in the render, since that state might differ between the request that filled the cache entry and a later request that reuses it.

The trap: trying to use `React.cache` as an implicit way to pass context into a cached function. The correct pattern is passing the value explicitly as a function argument, which then becomes part of the cache key.

**Q (Medium): Does `React.cache` provide any benefit across two separate HTTP requests to the same route?**

Answer: No. Like `fetch` memoization, `React.cache` is scoped to a single render pass — one request gets a fresh cache with nothing carried over from the previous request. Persisting a result across requests requires a different mechanism entirely: `"use cache"` with a `cacheLife` (Topic 5–6).

The trap: conflating "memoization" (dedup within one render) with "caching" (persistence across renders/requests) — they solve different problems and this repo deliberately uses different names for them for that reason.

**Q (Low): What determines whether two calls to a `React.cache`-wrapped function share a result?**

Answer: The function's identity (it's the same wrapped function reference) plus matching arguments. `getUser('42')` called twice returns the shared result; `getUser('42')` and `getUser('43')` are separate entries, each computed independently.

The trap: assuming `React.cache` caches "the function" globally regardless of arguments — it's argument-sensitive, same as any sane memoization scheme.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why `React.cache` is needed even though `fetch` gets automatic memoization
- [ ] Can write a minimal `React.cache`-wrapped async function from memory
- [ ] Can explain why `React.cache` values set outside a `"use cache"` scope aren't visible inside it
- [ ] Can explain why `React.cache` provides zero benefit across separate requests
- [ ] Can name a realistic use case (e.g., `generateMetadata` + page sharing one query)

---
*Next: The `"use cache"` directive — where persistence across requests actually comes from, and how it differs from everything covered so far in this phase.*
