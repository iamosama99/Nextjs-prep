# The `"use cache"` Directive

**Demo:** `app/playground/phase-03-rendering-caching/05-use-cache-directive` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/05-use-cache-directive`, and refresh several times.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `'use cache'` at the top of an async function | That function's return value persists across requests, not just within one render | The actual persistence mechanism — everything in Topics 3–4 was per-request only |
| `'use cache'` at the top of a component | Caches the component's rendered output (its serialized RSC output) | Works the same way, one level higher |
| `'use cache'` at the top of a file | Every exported function in that file is cached | Must all be async |
| Cache key | Build ID + function ID + serializable arguments (+ HMR hash in dev) | Different arguments ⇒ different cache entries, automatically |

## Where Does This Run?

Server. The function body runs once (per cache key, per its lifetime), most often at build time for a route's static shell, and its result is then reused across requests without re-running the function — this is the mechanism that finally gives you persistence beyond a single render, unlike Topics 3 and 4.

## What Is This?

Everything covered so far in this phase — Suspense boundaries, `fetch` memoization, `React.cache` — is scoped to a single render. `"use cache"` is different in kind: it's the directive that actually makes something's output outlive one request. Mark an async function or component with `'use cache'` at the top of its body, and its return value is computed once and reused for every later call with the same inputs, for as long as its lifetime allows (Topic 6 covers exactly how long).

```tsx
import { cacheLife } from 'next/cache'

export async function getUsers() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}
```

You can apply it at two granularities: **data-level**, caching a function that fetches or computes something (as above), or **UI-level**, caching an entire component's rendered output:

```tsx
export default async function Page() {
  'use cache'
  const users = await db.query('SELECT * FROM users')
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

> **Check yourself:** Without looking, explain in one sentence how `"use cache"` differs from `React.cache` (Topic 4) in terms of what "reuse" actually means.

## Why Does It Exist?

Before Cache Components, caching was route-shaped: `fetch(url, { cache: 'force-cache' })` cached a specific network call, and `export const revalidate = 3600` set a route-wide default — but there was no first-class way to cache the result of an arbitrary computation or a whole component's rendered subtree, short of the awkward `unstable_cache` wrapper (Topic 11 covers that migration in full). `"use cache"` unifies this: any async function or component, regardless of what it does internally — a `fetch`, a database query, a pure but expensive computation — can be given a cache lifetime with one directive, and that includes non-`fetch` sources that previously had no first-class caching story at all.

## How It Works

### The cache key

A cache entry's key is built from:

1. **Build ID** — unique per build (or your configured `deploymentId`); changing it invalidates every entry, which is why a new deploy always starts with a cold cache.
2. **Function ID** — a hash of the function's location and signature in your codebase.
3. **Serializable arguments** — the function's actual parameters *and* anything captured from an outer closure scope, which Next.js automatically binds in as if it were an argument.
4. **HMR refresh hash** — development only, invalidates on hot reload.

```tsx
async function Component({ userId }: { userId: string }) {
  const getData = async (filter: string) => {
    'use cache'
    // Cache key includes both userId (closure) and filter (argument)
    const res = await fetch(`https://api.example.com/users/${userId}/data?filter=${filter}`)
    return res.json()
  }
  return getData('active')
}
```

Different `userId`/`filter` combinations automatically get separate cache entries — you don't manage this yourself.

### What can cross the boundary

Arguments and return values must be serializable, but the two use **different** serialization systems (Server Component rules for arguments in, Client Component rules for return values out) — which is why a cached function can *return* JSX but cannot *accept* it as an argument, except as an untouched pass-through:

```tsx
async function CachedWrapper({ children }: { children: ReactNode }) {
  'use cache'
  // Fine — children is passed through, never introspected
  return <div className="wrapper">{children}</div>
}
```

Supported argument/return types: primitives, plain objects, arrays, `Date`/`Map`/`Set`/typed arrays. **Not** supported: class instances, functions (except as pass-through, like a Server Action forwarded to a Client Component), symbols, `WeakMap`/`WeakSet`, `URL` instances.

### The hard constraint: no Request-time APIs inside

A cached function (or anything it calls, following the call stack) **cannot** read `cookies()`, `headers()`, or `searchParams` — this throws immediately, not just in dynamic-route edge cases. This is the flip side of Topic 2's "extract and pass as an argument" pattern: it's not a suggestion, it's enforced. If you truly need runtime data *and* caching together, that narrow case is what `"use cache: private"` exists for (browser-only cache, never persisted server-side) — reach for it only when refactoring to pass values as arguments genuinely isn't practical.

### Where the result actually lives

`"use cache"` output is stored via a cache handler — **in-memory by default**. This matters a lot in serverless environments: each request can land on a different instance, so an in-memory entry may simply not be there for the next request, and the function re-runs. Self-hosted deployments with a persistent process reuse the entry normally. `"use cache: remote"` (a related, more advanced directive) moves storage to a durable, shared handler (Redis, a KV store) at the cost of a network round-trip — worth it only at a high hit rate. None of these survive a new deployment either way, since the build ID is part of the key.

### Interleaving: composition still works

Children/slots passed into a cached component aren't part of its cache entry, as long as the cached function's own body never reads or introspects them:

```tsx
async function CacheComponent({ header, children }: { header: ReactNode; children: ReactNode }) {
  'use cache'
  const res = await fetch('https://api.example.com/cached-data')
  const cachedData = await res.json()
  return (
    <div>
      {header}
      <PrerenderedComponent data={cachedData} />
      {children}
    </div>
  )
}
```

`header` and `children` can be dynamic, per-request content — they pass straight through without invalidating or being captured by the cache entry.

> **Check yourself:** A cached function accepts a `children: ReactNode` prop and renders it inside its returned JSX, without ever reading its contents. Does `children` being different across two calls create two separate cache entries? Why or why not?

## Gotchas

- **The result of `"use cache"` is genuinely shared** — this is the whole point, but it means it's the wrong tool for anything that must be different per user or per request (that's `"use cache: private"`, or just not caching it — Topic 2's pattern).
- **Serverless in-memory caching is unreliable across requests.** A `"use cache"` function with no `"use cache: remote"` may simply not persist between two consecutive requests on a serverless platform, even within the same cache lifetime window — don't assume "it's cached" means "it's guaranteed to skip re-execution" outside of a single build's static shell.
- **A cache directive alone gives an implicit `default` lifetime** (5 min stale / 15 min revalidate / never expire) if you don't call `cacheLife` — Topic 6 covers why an explicit profile is strongly recommended.
- **`React.cache` used outside a `"use cache"` scope is invisible inside it** — covered fully in Topic 4's gotchas, but worth repeating here since the two are easy to reach for interchangeably.

## Interview Questions

**Q (High): What is `"use cache"`'s cache key built from, and why does that mean two calls with different arguments never collide?**

Answer: The build ID, a hash of the function's location/signature (function ID), and the function's serializable arguments — including anything captured from an outer closure, which Next.js automatically binds in. Because arguments are part of the key, `getUser('42')` and `getUser('43')` are entirely separate entries computed independently; you don't need to manage cache-key uniqueness by hand the way you would with, say, a manual key-value cache.

The trap: assuming `"use cache"` caches "the function" as one shared slot regardless of inputs — it's argument-sensitive by design, same as `React.cache`, but persists across requests instead of just one render.

**Q (High): Why can't a `"use cache"` function read `cookies()` or `headers()`, even indirectly through a helper it calls?**

Answer: A cached function's result is meant to be reused across requests (and potentially different users), so it structurally cannot depend on data specific to one request's execution — Next.js enforces this by throwing (`next-request-in-use-cache`), and the restriction follows the whole call stack, not just the directly-annotated function. The documented pattern is to read the runtime value in an uncached, `<Suspense>`-wrapped component and pass the extracted value in as an argument, which then legitimately becomes part of the cache key.

The trap: reaching straight for `"use cache: private"` as a first resort. It's a narrower, more expensive escape hatch (browser-only storage, no server persistence) meant for cases where the extract-and-pass pattern genuinely isn't practical — not the default answer.

**Q (Medium): A `"use cache"` function isn't behaving as "cached" on a serverless deployment — repeated requests keep re-running its body. What's the likely explanation?**

Answer: `"use cache"` defaults to in-memory storage, and serverless environments are ephemeral — a given request may land on a fresh instance with no memory of the previous invocation's cache, so the function re-runs even though the cache lifetime hasn't expired. Build-time caching (the static shell) always works normally regardless; it's specifically the runtime, cross-request reuse that's unreliable without a durable handler. The fix is `"use cache: remote"` or a configured `cacheHandlers` entry for durable, shared storage.

The trap: assuming "cached" always means "guaranteed to skip re-execution" — with the default in-memory handler on serverless, it's closer to "may skip re-execution, opportunistically."

**Q (Medium): Can a cached function accept a `children` prop containing dynamic, per-request content without invalidating its cache entry?**

Answer: Yes — this is the "interleaving" pattern. As long as the cached function's own body never reads or introspects `children` (or any other compositional slot) and only passes it through in the returned JSX, that slot doesn't become part of the cache entry. This lets you build components that are mostly cached with a genuinely dynamic hole passed through as children, without extra ceremony.

The trap: assuming any prop passed to a cached component automatically becomes part of the cache key — only what the function actually *reads* does. An unread pass-through prop is invisible to the caching mechanism.

**Q (Low): What's the practical difference between caching at the "data" level versus the "UI" level with `"use cache"`?**

Answer: Data-level caching (`'use cache'` on a function that returns data) is reusable across multiple components/pages that need the same underlying data independently of how it's rendered. UI-level caching (`'use cache'` on a component) caches the rendered output itself — useful when an entire subtree, not just its data, is expensive to (re)compute and reused as-is.

The trap: treating them as mutually exclusive — the docs' own example shows a component-level cache (`getOrderSummary`) calling a data-level cache (`getOrders`) internally, and nesting is normal (Topic 6 covers how nested lifetimes interact).

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write a minimal `"use cache"`-annotated function and component from memory
- [ ] Can name the four components of a cache key
- [ ] Can explain why Request-time APIs are forbidden inside a `"use cache"` scope, and the recommended workaround
- [ ] Can explain why serverless in-memory caching may not persist across requests, and what fixes it
- [ ] Can explain the "interleaving" pattern for passing dynamic children through a cached component

---
*Next: `cacheLife` — now that you know a cache directive persists a result, the next question is for how long, and what that "how long" actually controls.*
