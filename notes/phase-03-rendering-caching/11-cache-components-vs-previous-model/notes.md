# Cache Components vs the Previous Model

**Demo:** None — this topic is a reference and migration comparison, not new runtime behavior. Every mechanism it covers on the Cache Components side has already been demonstrated live in Topics 1–10.

## Quick Reference

| Previous model (`cacheComponents` off — the App Router default) | Cache Components equivalent |
|---|---|
| `export const dynamic = 'force-dynamic'` | Not needed — dynamic by default |
| `export const dynamic = 'force-static'` | `"use cache"` with `cacheLife('max')` |
| `export const revalidate = N` | `cacheLife` (a preset or `{ revalidate: N }`) |
| `export const fetchCache = '...'` | Not needed — caching is explicit per `"use cache"` scope |
| `fetch(url, { cache: 'force-cache', next: { revalidate, tags } })` | `"use cache"` wrapping the fetch, + `cacheLife` + `cacheTag` |
| `unstable_cache(fn, keyParts, { revalidate, tags })` | `"use cache"` + `cacheLife` + `cacheTag` (no key-parts array — args are the key) |
| `unstable_noStore()` | Not needed — nothing is cached unless you add `"use cache"` |
| `revalidateTag(tag)` (no second arg) | `revalidateTag(tag, 'max')` — second argument now required |
| Reading `cookies()`/`headers()` anywhere | Same APIs, now must sit behind `<Suspense>` (Topic 2) |
| `generateStaticParams` returning `[]` | Now a **build error** — at least one param required (Topic 8) |
| `dynamicParams = false` | **Removed** — call `notFound()` in the page instead |
| `runtime = 'edge'` | **Not supported** — Cache Components requires Node.js |
| `experimental_ppr` / `experimental.ppr` | **Removed** — PPR is the default behavior once `cacheComponents: true` is set |

## Where Does This Run?

This is a build-time/config-time distinction, not a runtime one: `cacheComponents` is a single boolean in `next.config.ts` that changes which caching model the *entire application* uses. There's no per-route toggle between the two models — a route either lives in a Cache Components app or a previous-model app, determined by that one flag.

## What Is This?

Everything in Topics 1–10 assumed `cacheComponents: true` — which is genuinely on in this repo's `next.config.ts`, but is **not** the default for a fresh `create-next-app` project. Most existing Next.js codebases, and any interviewer who learned Next.js before this model shipped, will describe caching in terms of `fetch` options, route segment configs, and `unstable_cache`. This topic is the Rosetta Stone between the two: what each previous-model primitive maps onto, and why the mapping isn't always 1:1.

> **Check yourself:** Without looking, name what replaces `export const revalidate = 3600` under Cache Components, and what replaces `fetch(url, { next: { tags: ['x'] } })`.

## Why Does It Exist?

Two reasons this comparison earns its own topic rather than being folded into the individual API topics: first, **most real-world Next.js code you'll encounter in an interview or on the job was written against the previous model** — recognizing `dynamic = 'force-static'` and knowing it maps to `"use cache"` + `cacheLife('max')` is a realistic, common interview check. Second, **migration is incremental by design**, not a flip-a-switch operation — Next.js ships specific tooling (`instant = false`, a codemod, an adoption skill) precisely because large codebases can't convert every route atomically, and understanding that tooling is itself testable knowledge.

## How It Works

### The previous model, in brief

Without `cacheComponents`, `fetch` is uncached by default and opts into caching via `{ cache: 'force-cache' }`, tuned with `next: { revalidate, tags }`. Non-`fetch` sources use `unstable_cache(fn, keyParts, { revalidate, tags })` — note the explicit key-parts array, since without argument-based automatic keying (Topic 5's cache-key mechanism), the cache needs an explicit identifier. Route-level behavior is set via segment configs: `dynamic` (`'auto' | 'force-dynamic' | 'error' | 'force-static'`) and the more advanced `fetchCache`, which overrides the default `cache` option for every `fetch` in a segment. Critically, reading `cookies()`, `headers()`, or `searchParams` **anywhere** in the route opts the **entire route** into dynamic rendering — there's no Suspense-scoped dynamism the way Topic 2 describes; it's all-or-nothing per route.

### The migration path

Enabling `cacheComponents: true` immediately errors on any segment still exporting `dynamic`, `revalidate`, or `fetchCache` — you can't have both models active for the same route. For a large app, Next.js's own recommended path is:

1. Enable the flag and remove the old segment configs. Routes that already render instantly need no further work.
2. For routes that aren't ready, set `export const instant = false` on the offending segment — this **defers validation feedback** for that segment (it can still render, and may still be structured well enough to be instant), without disabling Cache Components' actual caching mechanics for it. A [codemod](/docs/app/guides/upgrading/codemods) can apply this across an entire app in one pass.
3. Fix synchronous IO first, since it **can't** be deferred — calls like `new Date()`, `Math.random()`, `crypto.randomUUID()` during prerendering throw a hard build error that `instant = false` does not suppress (Topic 1's `io()`/`connection()` pattern is the fix).
4. Convert routes one at a time, removing `instant = false` and resolving whatever insights the dev overlay surfaces (Topic 12 covers this tooling).

> **Good to know:** `instant = false` is about *validation*, not about opting a route out of Cache Components' caching model entirely — a route can still be genuinely instant with `instant = false` set; the framework just stops surfacing insights about it.

### Why some mappings aren't 1:1

- **`unstable_cache` vs. `"use cache"` persistence differs.** `unstable_cache` (like `fetch`'s Data Cache) persists across deployments and serverless instances. `"use cache"` defaults to in-memory storage that's discarded on serverless instance teardown and never survives a new deploy either way (Topic 5's gotcha) — `"use cache: remote"` is the durable equivalent, and it's an explicit opt-in, not automatic.
- **`revalidateTag`'s signature changed on purpose.** The single-argument form (`revalidateTag(tag)`) is deprecated under Cache Components; the second argument (a `cacheLife` profile or `{ expire }`) is now required to make the stale-serving window explicit rather than implicit (Topic 7).
- **`generateStaticParams` returning `[]` flipped meaning entirely.** Previously a legitimate "generate everything on demand" signal; now a hard error, because Cache Components needs at least one concrete render to validate against (Topic 8).

## Gotchas

- **You cannot mix the two models within a single app.** The flag is global; a route can't individually opt into the old `fetch`-options-and-segment-config model while `cacheComponents: true` is set elsewhere in the same `next.config.ts`.
- **`instant = false` is not an escape hatch from Cache Components** — it only silences validation feedback for that segment; the segment still uses `"use cache"`/`<Suspense>` semantics, not the previous model's `fetch` options.
- **`runtime = 'edge'` is a hard incompatibility**, not a deprecation warning — if you need edge-like behavior for specific routes under Cache Components, the answer is [Proxy](/docs/app/api-reference/file-conventions/proxy) (formerly Middleware — Phase 7 covers this), not the page/layout runtime export.

## Interview Questions

**Q (High): A codebase you're reviewing has `export const revalidate = 3600` on several pages and `fetch(url, { next: { tags: ['posts'] } })` scattered through data-fetching functions. Is this Next.js 16? What would each of these look like if it were migrated to Cache Components?**

Answer: This is the previous caching model — it works in Next.js 16 too, but only when `cacheComponents` is *not* enabled; it's not evidence of which version is running, just which model is active. Migrated: `revalidate = 3600` becomes `cacheLife({ revalidate: 3600 })` (or the closest preset, like `'hours'`) inside a `"use cache"` function. The tagged fetch becomes a `"use cache"`-wrapped function calling `cacheTag('posts')` internally, with the `fetch` itself losing its `next.tags` option since tagging now happens via `cacheTag`, not the `fetch` call.

The trap: assuming route segment configs are Next.js-version-gated rather than model-gated — they still work fine in 16 without the flag, which is exactly why recognizing both models matters.

**Q (High): Why does `generateStaticParams` returning an empty array mean something different under Cache Components than it did before?**

Answer: Previously, `[]` was a legitimate instruction: "don't prerender anything for this route, generate every path on first visit" (the direct analog of Pages Router's `fallback: true` with zero pre-built paths). Under Cache Components, an empty array is a build error, because Cache Components needs at least one concrete rendered instance of the route to validate against — with zero params, there's nothing for the framework to confirm actually produces a correct static shell.

The trap: assuming this is an arbitrary breaking change rather than connecting it to Cache Components' broader theme (introduced across Topics 1, 8, 12) of validating that routes produce a real static shell, not just accepting configuration that defers the question indefinitely.

**Q (Medium): What does `export const instant = false` actually do — does it disable Cache Components for that route?**

Answer: No — it opts the segment out of *validation feedback* only. The segment still uses Cache Components' actual mechanics (`"use cache"`, `<Suspense>`-scoped dynamism); Next.js simply stops surfacing dev-overlay insights about whether that segment renders instantly. This is the tool for incrementally adopting Cache Components across a large app: get everything building and running first with `instant = false` on routes that aren't ready, then remove it route-by-route as each is actually fixed.

The trap: treating `instant = false` as equivalent to not enabling `cacheComponents` for that route — the two are unrelated; one is a global model switch, the other is a per-segment validation-noise switch.

**Q (Medium): Why can't `unstable_cache`'s explicit key-parts array just be dropped in favor of `"use cache"`'s automatic argument-based keying without any other changes?**

Answer: Functionally, argument-based keying (Topic 5) does replace the need for an explicit key-parts array — `"use cache"`'s cache key is derived automatically from the function's arguments and captured closure variables. But the *storage* behavior isn't identical: `unstable_cache` persists like `fetch`'s Data Cache (across deployments and serverless instances), while `"use cache"` defaults to in-memory storage that doesn't survive either. A straight swap can silently change a cache from "durable" to "best-effort," which matters a lot in serverless deployments — `"use cache: remote"` is the durable equivalent if that persistence is actually required.

The trap: treating the migration as purely syntactic (drop the array, add a directive) and missing the storage-durability implication, which is the kind of production-relevant nuance senior interviews probe for.

**Q (Low): Can you use `runtime = 'edge'` on a specific route in an app that has `cacheComponents: true` enabled globally?**

Answer: No — Cache Components requires the Node.js runtime across the board; `runtime = 'edge'` is unsupported and the deprecated export should be removed. If edge-like behavior is genuinely needed for specific request handling, [Proxy](/docs/app/api-reference/file-conventions/proxy) (Phase 7) is the intended tool, not a per-route runtime override on a page or layout.

The trap: assuming runtime selection remains an independent, orthogonal per-route knob under Cache Components — it doesn't; the global caching model constrains it.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can map `dynamic`, `revalidate`, and `fetchCache` route segment configs onto their Cache Components equivalents
- [ ] Can explain why `unstable_cache` and `"use cache"` differ in storage durability, not just syntax
- [ ] Can explain what `instant = false` actually opts out of (validation, not caching mechanics)
- [ ] Can explain why `generateStaticParams` returning `[]` changed meaning
- [ ] Can name the recommended incremental adoption path (flag on → `instant = false` → fix sync IO → convert route-by-route)

---
*Next: Debugging cache & rendering behavior — the tooling (dev overlay insights, the Navigation Inspector, verbose cache logging) for actually diagnosing which of everything in this phase is happening on a given route.*
