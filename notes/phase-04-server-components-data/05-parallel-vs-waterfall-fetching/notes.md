# Parallel Data Fetching vs Sequential Waterfalls

**Demo:** `app/playground/phase-04-server-components-data/05-parallel-vs-waterfall-fetching` — run `npm run dev`, visit `/playground/phase-04-server-components-data/05-parallel-vs-waterfall-fetching`, and compare the two sections' load times.

## Quick Reference

| You write | What actually happens | Total time for two 200ms calls |
|---|---|---|
| `const a = await getA(); const b = await getB()` (B doesn't need A) | An **accidental waterfall** — B doesn't start until A finishes | ~400ms |
| `const a = await getA(); const b = await getB(a)` (B genuinely needs A) | A **necessary** sequential dependency — not a bug | ~400ms, but correctly so |
| `const pa = getA(); const pb = getB(); await Promise.all([pa, pb])` | Both requests **initiated** before either is awaited | ~200ms |
| Sibling layout and page, each fetching independently | Parallel **by default** — no `Promise.all` needed | Each starts as soon as its own segment begins rendering |

## Where Does This Run?

Server, within the render of whichever component(s) issue the requests. The distinction in this topic is entirely about *when a request starts* relative to other requests — not about a different execution environment.

## What Is This?

Topic 4 showed a component can `await` more than one thing. Whether that's fine or a real cost depends on one question: **does the second request need the first's result?** If yes, sequential is correct — there's no way around it. If no, writing them sequentially anyway is a **waterfall**: an accidental serialization of two things that could have run at the same time.

```tsx
// Waterfall — getAlbums doesn't need artist, but the code makes it wait anyway
const artist = await getArtist(username)
const albums = await getAlbums(username)
```

```tsx
// Parallel — both requests start immediately; only the awaiting is deferred
const artistData = getArtist(username)   // starts now
const albumsData = getAlbums(username)   // also starts now
const [artist, albums] = await Promise.all([artistData, albumsData])
```

The difference is subtle in the code (two lines either way) but significant in effect: calling the function *without* `await` starts the request immediately and returns a pending promise; `await` is what actually pauses execution. Two calls made before either is awaited run concurrently; the same two calls with `await` interleaved between them run one after the other.

> **Check yourself:** Without looking, explain why `const a = await getA(); const b = await getB()` and `const pa = getA(); const pb = getB(); await pa; await pb` produce different total timing, even though both eventually await both promises.

## Why Does It Exist?

Sequential `await` is the natural, readable way most people first write async code — it reads top to bottom like synchronous code, which is exactly what makes the accidental-waterfall version look completely unremarkable at a glance. The problem is purely a latency one: for two genuinely independent 200ms requests, the difference between ~200ms and ~400ms total is real, user-perceptible time, multiplied across however many such pairs exist in a page. Recognizing which shape you've written — and, more importantly, whether the dependency it implies is real — is a skill, not a syntax lesson.

## How It Works

### The tree is parallel by default; a single component's body is not

Layouts and pages in different route segments render in parallel automatically — each starts fetching as soon as its own segment begins rendering, with no `Promise.all` needed, because they're independent components in the tree, not sequential statements in one function. This is a separate mechanism from the pattern above: tree-level parallelism happens for free; parallelism *within* one component's sequence of `await`s has to be written deliberately.

### The idiomatic pattern

Call every independent async function first, without `await`, to start each request; only await them together afterward:

```tsx
async function getArtist(username: string) {
  const res = await fetch(`https://api.example.com/artist/${username}`)
  return res.json()
}
async function getAlbums(username: string) {
  const res = await fetch(`https://api.example.com/artist/${username}/albums`)
  return res.json()
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const artistData = getArtist(username)   // fires now
  const albumsData = getAlbums(username)   // fires now, doesn't wait for artistData
  const [artist, albums] = await Promise.all([artistData, albumsData])
  return <><h1>{artist.name}</h1><Albums list={albums} /></>
}
```

### Memoization still applies underneath this

If two independently-initiated requests happen to hit the *same* URL with the same options, Request Memoization (Phase 3, Topic 3) still collapses them into one actual network call — parallelizing independent requests and deduplicating identical ones are separate, complementary mechanisms, not competing ones.

### A genuine dependency doesn't have to block the whole page

When B really does need A's result, the sequential cost is unavoidable *for that piece* — but it doesn't have to gate everything else on the page. Wrapping the dependent chain in its own `<Suspense>` boundary (Topic 6) lets the rest of the page's content ship immediately while that one chain resolves on its own schedule, which is often a better fix than trying to eliminate a real dependency that can't actually be removed.

## Gotchas

- **`Promise.all` fails entirely if any one promise rejects.** If two calls are combined with `Promise.all` and one fails, the whole `await` throws — even if the other succeeded. Use `Promise.allSettled` instead when partial results are acceptable and you want to handle each outcome individually.
- **Tree-level parallelism (sibling segments) doesn't rescue a waterfall written inside a single component.** These are two different mechanisms; a page whose *own* function body awaits sequentially is still a waterfall regardless of how parallel the rest of the route's segments are.
- **Don't force independence that isn't real.** Restructuring a genuinely dependent fetch (B needs A's ID) into a fake `Promise.all` by guessing or hardcoding what A would have returned introduces bugs for the sake of a latency win that doesn't actually exist for that pair — the fix for a real dependency is Suspense-scoping it, not artificially parallelizing it.

## Interview Questions

**Q (High): Given `const artist = await getArtist(id); const albums = await getAlbums(id)`, where `getAlbums` doesn't use anything from `artist`, what's wrong with this code and how would you fix it?**

Answer: This is an accidental waterfall — `getAlbums` doesn't start until `getArtist` fully resolves, even though nothing about it depends on `artist`'s result, so the two requests run sequentially instead of concurrently. The fix is calling both functions before awaiting either: `const artistData = getArtist(id); const albumsData = getAlbums(id); const [artist, albums] = await Promise.all([artistData, albumsData])` — both requests fire immediately, and total time collapses from the sum of both durations to roughly the longer of the two.

The trap: "fixing" this by wrapping each call in `Promise.resolve()` or otherwise not understanding that the actual fix is deferring the `await`, not changing what's awaited.

**Q (High): Are sibling `layout.tsx` and `page.tsx` files' data fetches automatically parallel, or do they need `Promise.all` too?**

Answer: Automatically parallel — each route segment starts fetching as soon as its own render begins, independent of sibling segments, with no `Promise.all` needed. This is separate from (and doesn't substitute for) parallelizing multiple independent `await`s *inside* a single component's function body, which does require the explicit "call first, await together" pattern.

The trap: conflating tree-level parallelism (free, automatic) with within-component parallelism (requires deliberate restructuring) — a page can have perfectly parallel sibling segments and still contain an internal waterfall.

**Q (Medium): You combine two independent fetches with `Promise.all`, and one of them can legitimately fail some of the time (e.g., an optional third-party enrichment call). What breaks, and what's the fix?**

Answer: `Promise.all` rejects as soon as any one of its promises rejects, which means the *entire* `await` throws — including losing access to the other promise's successful result, unless you'd already awaited it separately. `Promise.allSettled` is the fix: it always resolves, giving you an array of `{status, value}` or `{status, reason}` for each promise, so you can use whichever ones succeeded and handle the failed one explicitly instead of losing everything to one optional call's failure.

The trap: reaching for a `try/catch` around the whole `Promise.all` call as the fix — that recovers from the failure but still discards the successful result unless you restructure to use `allSettled` or per-promise `.catch()` handlers.

**Q (Medium): A component has a genuine sequential dependency (B needs A's ID) that takes 400ms combined. Is there anything you can do about the user-facing latency, given the dependency itself can't be removed?**

Answer: You can't shorten the dependent chain itself, but you can prevent it from blocking the *rest* of the page — wrapping that specific A-then-B chain in its own `<Suspense>` boundary lets everything else on the page ship immediately in the initial response, with only that one dependent section streaming in once it resolves (Topic 6). The 400ms is still real for that piece, but it stops being 400ms added to the entire page's time-to-first-byte.

The trap: treating "this dependency can't be parallelized" as equivalent to "there's nothing to optimize here" — the optimization available isn't eliminating the latency, it's scoping its blast radius.

**Q (Low): Does starting two requests with `Promise.all` change how many actual network calls are made if both requests happen to hit the identical `fetch` URL?**

Answer: No — Request Memoization (Phase 3) still applies underneath. If both promises are calls to `fetch` with an identical URL and options, the second one reuses the first's in-flight/resolved result rather than firing a second network request, regardless of whether they were initiated via `Promise.all` or sequential awaits. Parallelizing independent *different* requests and deduplicating *identical* ones are separate mechanisms operating at the same time.

The trap: assuming `Promise.all` somehow bypasses or is unrelated to memoization — they compose transparently; memoization operates at the `fetch` call level regardless of how the surrounding code is structured.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write both the waterfall and the parallel version of two independent fetches from memory
- [ ] Can explain why sibling route segments are parallel by default while awaits inside one component aren't
- [ ] Can explain the difference in failure behavior between `Promise.all` and `Promise.allSettled`
- [ ] Can explain what to do about a genuine sequential dependency's latency, given it can't be parallelized away
- [ ] Can explain why memoization and parallel fetching are separate, composable mechanisms

---
*Next: Streaming with Suspense boundaries — the tool this topic leaned on for "don't let a slow, necessary chain block the rest of the page," covered in full: loading states, streaming HTML, and where to actually place the boundaries.*
