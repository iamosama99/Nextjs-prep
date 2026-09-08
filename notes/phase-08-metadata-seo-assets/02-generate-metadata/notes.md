# `generateMetadata` — Dynamic, Data-Driven Metadata

**Demo:** `app/playground/phase-08-metadata-seo-assets/02-generate-metadata/` — a `products/[id]/page.tsx`
that fetches per-product data and extends the parent's `openGraph.images` via `ResolvingMetadata`, and a
`personalized/page.tsx` that reads a cookie. Both routes deliberately hit real Cache Components build
errors first — verified with the exact error text below — before being fixed with the docs' own
recommended patterns, then re-verified with a clean `npm run build` and real `curl` output against a
running dev server.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `async function generateMetadata(props, parent)` | The dynamic counterpart to the static `metadata` object — returns the same `Metadata` shape | Use it whenever a field depends on `params`, `searchParams`, or fetched data |
| `parent: ResolvingMetadata` | A promise of the metadata already resolved from ancestor segments | `await parent` lets you **extend** (e.g. append to `openGraph.images`) instead of blindly replacing |
| Same data fetched in both `generateMetadata` and the page | Automatically deduped to one call **per request** | Verified: wrapping the fetch in React's `cache()` collapsed two call sites into a single log line for one real request |
| `generateMetadata` reading `cookies()`/`headers()`/`params` with no cache or Suspense marker, on an otherwise-static route | A real Cache Components **build error**, not a warning | Verified: `Next.js encountered uncached or runtime data in \`generateMetadata()\`` |
| A dynamic segment with `generateStaticParams`, but `generateMetadata` still awaits `params` directly | Still forces that route to Partial Prerender (`◐`), not full static (`●`) | Verified via `npm run build`'s route table — metadata streams in as deferred content even for listed params |

## Where Does This Run?

Server-only, same as the static `metadata` export (Topic 1) — `generateMetadata` is only supported in Server Components, for the identical reason: the resolved metadata has to exist before (or, per this project's Cache Components setup, alongside as streamed content) the response Next.js sends. The difference from Topic 1 is *when* within that server-side process it resolves: a static `metadata` object is known before any rendering starts, while `generateMetadata` is an async function that may need to fetch, read `params`, or read runtime request data first.

## What Is This?

`generateMetadata` is an async function — exported instead of the plain `metadata` object — that receives the route's `params`/`searchParams` and a promise of the parent segments' already-resolved metadata, and returns a `Metadata` object with the exact same shape Topic 1 covered:

```tsx
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  return { title: product.title, description: product.description }
}
```

A route segment can export **either** `metadata` **or** `generateMetadata`, never both — if any field needs to be computed, the whole segment's metadata goes through `generateMetadata`.

> **Check yourself:** If a segment's metadata doesn't actually depend on `params`, `searchParams`, or any fetched data, should it still use `generateMetadata` "to be safe," or does that cost something?

## Why Does It Exist?

Plenty of real metadata is entirely data-driven — a blog post's title *is* whatever the CMS stored for that slug, a product page's Open Graph image *is* whatever that specific SKU has on file. A plain `const metadata` export can't express "look this up first," since it's evaluated as static data, not executed as logic. `generateMetadata` exists to close that gap without inventing a second, different metadata shape — it returns the identical `Metadata` object Topic 1 already established, just computed instead of literal.

The `parent` parameter exists for a narrower but real reason: metadata inheritance (Topic 3) is normally automatic and shallow (a child segment that sets its own `openGraph` fully replaces the parent's), but sometimes a child genuinely wants to *build on* the parent's value rather than discard it — e.g., adding one more Open Graph image without losing the site-wide default ones. Since `generateMetadata` runs as code, it can explicitly `await parent` and merge, which a static object export has no mechanism for.

## How It Works

### Fetch memoization across `generateMetadata` and the page

The docs recommend wrapping any data fetched by both `generateMetadata` and the page component in React's `cache()` (or relying on `fetch`'s own automatic request memoization) so the underlying work happens once, not twice. This demo verified it directly: `getProduct(id)` — wrapped in `cache()` — logs `[getProduct] fetching id=...` on every call site that isn't deduped. A single real request to `/products/1` (via `curl` against a running dev server, checked against the dev server's own log output) produced **exactly one** log line, despite `getProduct` being called once inside `generateMetadata` and once inside the page's own component tree.

Worth being precise about scope: this dedup is *per request*, not global. During `npm run build`'s static generation, the same `getProduct('1')` call was observed logging **twice** — this is a separate, build-time-specific effect (static generation renders a route more than once as part of producing its prerendered output) and doesn't contradict the per-request memoization guarantee that matters at actual runtime.

### Extending parent metadata instead of replacing it

```tsx
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  const previousImages = (await parent).openGraph?.images ?? []

  return {
    title: product.title,
    openGraph: { images: [`/og/product-${id}.png`, ...previousImages] },
  }
}
```

Verified directly: this topic's layout sets `openGraph.images: ['/og/base-image.png']` and `metadataBase: new URL('http://localhost:3000')`. The rendered page for product 1 carries **two** `og:image` tags — `.../og/product-1.png` first, then `.../og/base-image.png` — both resolved to full absolute URLs via `metadataBase` (a relative string in a URL-based field with no `metadataBase` anywhere in the chain is a build error, per Topic 1's reference material). Without the `await parent` step, returning `openGraph: { images: [...] }` directly would have **replaced** the parent's `images` array entirely — the same shallow-merge behavior Topic 1 documented for ordinary segment inheritance, just made explicit and controllable here since `generateMetadata` is code rather than a static object.

> **Check yourself:** If this `generateMetadata` had returned `openGraph: { images: [...] }` without first reading `previousImages` from `parent`, would `og:image` for the base layout image still appear in the final page?

### Cache Components changes what "just read `cookies()`" costs

This project has `cacheComponents: true` enabled (Phase 3), and that changes what's allowed inside `generateMetadata` far more than the docs' general description suggests until you actually trigger it. A `generateMetadata` that reads `cookies()`, `headers()`, `params`, or `searchParams` — or performs uncached data fetching — counts as **runtime data**. What happens next depends on the rest of the route:

**Case 1 — the route is otherwise fully static, verified with a real error.** This demo's first version of `personalized/page.tsx` read a cookie inside `generateMetadata` with no other dynamic content on the page. `npm run build` failed with:

```
Route "/playground/.../personalized": Next.js encountered uncached or runtime data in `generateMetadata()`.

This route's metadata is blocked, but the rest of its content can be prerendered.

Ways to fix this:
  - [static] Use a static metadata export instead of `generateMetadata()`
  - [cache] Cache the metadata with `"use cache"` in `generateMetadata()` (does not apply to `connection()`)
  - [dynamic] Render a marker component that calls `await connection()` inside `<Suspense>` on the page
```

This is Next.js refusing to guess whether streaming metadata for an otherwise-100%-static page was intentional — the docs frame this exact ambiguity as the reason for the error: streaming metadata while everything else on the page is fully prerenderable is unusual enough that it wants an explicit signal, not a silent fallback. The fix applied here was the `[dynamic]` option — a component that does nothing but `await connection()`, wrapped in `<Suspense>` on the page:

```tsx
async function DynamicMarker() {
  await connection()
  return null
}

export default function PersonalizedPage() {
  return (
    <div>
      {/* ...static content... */}
      <Suspense><DynamicMarker /></Suspense>
    </div>
  )
}
```

Verified: after adding this, the build succeeded, and the route classified as `◐` (Partial Prerender) rather than failing — the static parts of the page prerender into a shell, and the cookie-driven title streams in alongside the marker's own (empty) dynamic content.

**Case 2 — the route already has other deferred content, verified via the product pages.** `products/[id]/page.tsx` has `generateStaticParams` listing known ids, but its `generateMetadata` still awaits `params` directly (there's no way to wrap a plain async function's own body in JSX `<Suspense>` the way a component's return value can be). Fixing *only* the page component's `params` access (below) was enough to get a clean build — no explicit `[dynamic]` marker was needed here, because the page already had deferred content once its own `params` read was pushed into a `<Suspense>`-wrapped child, so the metadata simply streamed in alongside it. The build's route table confirms this: `products/1` and `products/2` — both listed by `generateStaticParams` — classify as `◐`, not `●`, precisely because metadata resolution itself remains request-time work even for enumerated params.

### A second, independent error this demo surfaced: unguarded `params` in the page body

Fixing the `personalized` route did not fix `products/[id]` — the next `npm run build` hit a *different*, more general error, on the page component itself rather than `generateMetadata`:

```
Route "/playground/.../products/[id]": Next.js encountered uncached or runtime data during prerendering.

`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed outside of
`<Suspense>` prevents the route from being prerendered...
```

The cause: `ProductPage`'s own body awaited `params` at the top of the component, unguarded — the exact anti-pattern Phase 3 Topic 8 already established (**"Awaiting `params` matters even for listed values"**): even a `slug`/`id` your own `generateStaticParams` explicitly lists still needs the await pushed into a `<Suspense>`-wrapped child, because Next.js wants one reusable App Shell structure that works identically for listed and unlisted param values alike. The fix here is the identical pattern:

```tsx
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Loading product…</p>}>
      <ProductDetails params={params} />
    </Suspense>
  )
}

async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

Two structurally different bugs, two structurally different fixes — `generateMetadata`'s runtime-data problem needed a `connection()` marker (Case 1) or already-present deferred sibling content (Case 2), while the page component's own unguarded `params` needed the ordinary push-into-Suspense treatment. Both are real, independently triggerable build failures under this project's Cache Components configuration, not two symptoms of one root cause.

## Gotchas

- **`generateMetadata` reading `cookies()`/`headers()`/`params`/`searchParams`/uncached `fetch()` on an otherwise-fully-static route is a build error under Cache Components**, not a silent fallback to dynamic rendering — verified directly above, with the exact three suggested fixes ([static]/[cache]/[dynamic]) the error itself lists.
- **A route with `generateStaticParams` is not automatically exempt from needing `params` access guarded behind `<Suspense>`** — this applies to the page component's own body just as much as it did in Phase 3 Topic 8, and `generateMetadata`'s own unavoidable `params` read still pushes the route to Partial Prerender (`◐`) rather than full static (`●`), even for listed ids.
- **Extending `parent` metadata is opt-in, not automatic** — returning a nested field like `openGraph` from `generateMetadata` without first `await`ing `parent` and spreading its prior value replaces it entirely, identical to the shallow-merge behavior Topic 1 covered for plain nested `metadata` exports.
- **The two build errors shown above look similar but are diagnosing different code** — one names `generateMetadata()` specifically and offers a `[cache]`/`[dynamic]`/`[static]` menu; the other is the general Cache Components dynamic-access error naming `fetch`/`cookies`/`headers`/`params`/`searchParams`/`connection()` and offers `[stream]`/`[cache]`/`[block]`. Fixing one does not fix the other if both problems exist simultaneously, as this demo's own build sequence showed.
- **Fetch memoization is per-request, not global** — verified two ways: a single dev-server request logs `getProduct` exactly once, but the *same* id logged twice during `npm run build`'s static generation phase, since prerendering a route can render it more than once as part of producing output. Don't mistake the build-time count for a broken cache.

## Interview Questions

**Q (High): Under Cache Components, why does `generateMetadata` reading `cookies()` on an otherwise fully static page fail the build instead of just making that one route dynamic?**

Answer: Because the ambiguity is real and the framework refuses to silently guess. A page that's otherwise 100% prerenderable but streams personalized metadata is an unusual combination — the docs' own reasoning is that this needs an explicit developer choice, since defaulting to "make the whole page dynamic" would silently give up prerendering the static content, while defaulting to "ignore the runtime data" would silently produce wrong metadata. Verified directly: the build fails with a named error offering exactly three explicit resolutions — go back to static metadata, cache the data with `"use cache"`, or add a `connection()`-based dynamic marker under `<Suspense>` to declare the dynamism intentional.

The trap: assuming Next.js will "figure it out" the way plain SSR frameworks silently render everything dynamically when they see `cookies()` — Cache Components' whole design point is refusing that silent fallback.

**Q (High): A dynamic route has `generateStaticParams` listing every valid id. Does that mean the page component can safely await `params` directly at the top of its function?**

Answer: No — verified directly with a real build failure. Even for ids the page's own `generateStaticParams` explicitly enumerates, Cache Components still requires the `params` await to happen inside a `<Suspense>`-wrapped child component, not at the top of the page. The reason (established in Phase 3 Topic 8, reconfirmed here for the metadata context): Next.js builds one reusable App Shell structure meant to serve both listed and unlisted param values identically, and an unguarded top-level await ties the entire render to one concrete URL, defeating that shared shell.

The trap: reasoning "I listed every valid value, so there's nothing left to be dynamic about" — the requirement is structural (how the component is written), not about whether the specific values are actually known.

**Q (Medium): What's the difference between `title.default`/`title.absolute` (Topic 1, works on a static `metadata` object) and using `parent` inside `generateMetadata`?**

Answer: `title.default`/`title.absolute` are declarative fields *within* the static `Metadata` shape that control title-string composition specifically. `parent` is a completely different mechanism — a promise of the *entire already-resolved* `Metadata` object from ancestor segments, available only inside `generateMetadata` because it requires actually running code to `await` and selectively merge. `parent` can extend any field (not just title), like this demo's `openGraph.images` array concatenation — something no static-object-only field like `title.template` could express for a non-title field.

The trap: assuming inheritance is one single mechanism throughout the Metadata API — it's actually two: automatic shallow merging (default, for both static and generated metadata, per Topic 1/3) and this opt-in, code-driven extension via `parent`, which only `generateMetadata` can use.

**Q (Medium): Why did fixing the `personalized` route's `generateMetadata` error not also fix the `products/[id]` route's build error in this demo, even though both involve Cache Components and dynamic data?**

Answer: They were two independently-triggerable failures with different root causes. `personalized`'s error was specifically about `generateMetadata()` reading runtime data (`cookies()`) with no other dynamic content anywhere on an otherwise-static page. `products/[id]`'s error was about the *page component itself* awaiting `params` unguarded at the top — a completely different code path from `generateMetadata`, diagnosed by a differently-worded, more general error. Fixing the first didn't touch the second because they're genuinely separate lines of code with separate violations.

The trap: treating "one Cache Components error" and "the build is fixed" as the same milestone — a build can have multiple independent violations, and `npm run build` only reports the first one it hits per route, so a second, unrelated error can appear only after the first is resolved (exactly what happened here).

**Q (Low): Why does the fetch-memoization dedup this demo verified (one `getProduct` call per real request) not extend to `npm run build`'s static generation, where the same id logged twice?**

Answer: React's `cache()` scopes memoization to a single render/request lifecycle. A real HTTP request to a running server is one such lifecycle, which is why the dev-server test showed exactly one log line. Static generation at build time is a different execution context — Next.js can render a route's output more than once while producing its prerendered artifacts — so seeing the same id fetched twice during `npm run build` reflects build-time mechanics, not a broken or bypassed cache.

The trap: treating a build log's call count as evidence about runtime dedup behavior — they're different execution contexts and aren't directly comparable.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state, from memory, all three suggested fixes the `generateMetadata()`-runtime-data build error offers
- [ ] Can explain why a page's own unguarded `params` access is a *different* error from `generateMetadata`'s runtime-data error, even on the same route
- [ ] Can explain what `await parent` inside `generateMetadata` is for and write the pattern that extends (not replaces) a parent's `openGraph.images`
- [ ] Can explain why a dynamic route with full `generateStaticParams` coverage can still classify as `◐` instead of `●`
- [ ] Knows fetch memoization is per-request, not something a build log's call count directly demonstrates

---
*Next: Metadata inheritance & overriding across layouts — a closer, multi-level look at the shallow-merge
and title-template mechanics Topics 1 and 2 already exercised at a single layout depth.*
