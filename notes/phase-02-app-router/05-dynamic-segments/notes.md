# Dynamic Segments `[id]`

## Quick Reference

| Fact | Detail |
|---|---|
| Syntax | `app/blog/[slug]/page.tsx` captures the segment as `slug` |
| Access | Via the `params` prop passed to `page.tsx` (and `layout.tsx`, for its own segment) |
| **Next.js 15 change** | `params` (and `searchParams`) are now **Promises** — must be `await`ed |
| Multiple dynamic segments | Allowed at different nesting levels, e.g. `[category]/[product]` |
| Type | `{ slug: string }` wrapped in a `Promise` in Next.js 15; a plain object pre-15 |

## Where Does This Run?

Server — `params` is resolved as part of rendering the Server Component for that route (or inside a Route Handler, Phase 6). The *value itself* comes from the incoming request's URL, so it's inherently per-request, dynamic data — not something available at build time unless you've explicitly pre-generated it (`generateStaticParams`, Phase 3).

## What Is This?

A folder name wrapped in square brackets — `[slug]`, `[id]`, `[username]` — captures whatever value actually appears in that position of the URL and exposes it to the route as a parameter, instead of you writing manual URL parsing or regex matching. `app/blog/[slug]/page.tsx` matches any request like `/blog/hello-world` or `/blog/my-post`, with `slug` bound to `"hello-world"` or `"my-post"` respectively.

> **Check yourself:** For the route file `app/shop/[category]/[product]/page.tsx`, what would `params` contain for a request to `/shop/electronics/headphones`?

## Why Does It Exist?

Almost every real app has routes whose exact path can't be enumerated in advance — a blog post's slug, a product's ID, a user's username. Dynamic segments let the file-based routing convention (Topic 1) extend to this case without breaking its core idea: the folder structure still fully describes the shape of the URL space, just with a named placeholder instead of a literal string, and Next.js handles extracting and typing the actual value for you.

## How It Works

```tsx
// app/blog/[slug]/page.tsx  (Next.js 15+)
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <h1>{slug}</h1>;
}
```

**The Next.js 15 change is the detail most worth being precise about.** Prior to Next.js 15, `params` (and `searchParams`) were plain synchronous objects passed directly as props. Starting in Next.js 15, they're `Promise`s that must be awaited before use. This wasn't a stylistic API change — it's tied to enabling more granular rendering and caching. By making `params`/`searchParams` asynchronous, Next.js can start producing a route's static, non-parameter-dependent shell immediately, without being blocked on resolving the specific dynamic value first, and stream in the parameter-dependent parts once they're available — the foundation Partial Prerendering (Phase 11) builds on. Treating these values as synchronous would have meant every route touching them was implicitly "wait for this value before doing anything," which works against that model.

**Multiple dynamic segments** simply nest, each contributing its own key to `params`:

```
app/shop/[category]/[product]/page.tsx
```
matches `/shop/electronics/headphones` with `params` resolving to `{ category: "electronics", product: "headphones" }`.

**A layout can also receive `params`** for its own segment — if `app/blog/[slug]/layout.tsx` exists, it gets `{ slug: string }` too (as a Promise in Next.js 15) — but never `searchParams`, per the persistence reasoning covered in Topic 2.

> **Check yourself:** Why does making `params` a Promise instead of a plain object help Next.js render part of a page before the dynamic route parameter is even resolved?

## Gotchas

- **Forgetting to `await params` in Next.js 15** — TypeScript will catch this at compile time if `params` is correctly typed as a `Promise`, but it's a genuinely easy thing to miss when migrating code or copying older examples that assumed a synchronous object.
- **Confusing route params with `searchParams`.** `[slug]` captures part of the *path* (`/blog/hello-world`); `searchParams` captures the *query string* (`?sort=asc`) — they're distinct mechanisms serving different parts of the URL, and only `page.tsx`/Route Handlers get `searchParams` at all (Topic 2).
- **Segment names must be consistent across parallel dynamic routes referencing the same conceptual value** — inconsistent naming (`[id]` in one place, `[postId]` in another for what's meant to be the same concept) doesn't break anything mechanically but undermines the type-safety benefit `typedRoutes` (Phase 1, Topic 5) is meant to provide.

## Interview Questions

**Q (High): How do you access a dynamic route segment's value inside `page.tsx`, and what changed about this in Next.js 15?**

Answer: The segment's captured value is available via the `params` prop. In Next.js 15, `params` (along with `searchParams`) became a `Promise` that must be awaited before its properties can be read, rather than a plain synchronous object as it was in earlier versions.

The trap: writing (or reading) `params.slug` directly without awaiting, which either fails to compile under a correctly typed Next.js 15 project or, in looser typing, produces a runtime bug where `slug` is `undefined` because `params` is still a Promise.

**Q (High): Why did Next.js make `params`/`searchParams` asynchronous instead of plain objects?**

Answer: To decouple a route's static, parameter-independent shell from the specific dynamic value — making these Promises lets Next.js begin producing and streaming parts of a page that don't depend on `params`/`searchParams` before those values are actually resolved, rather than being forced to block the entire render on them upfront. This is the underlying mechanism that Partial Prerendering (Phase 11) builds on.

The trap: guessing "just to match Server Actions being async" or another surface-level reason, rather than tying it to the specific rendering/streaming capability it enables.

**Q (Medium): Can a single route have multiple dynamic segments? Give an example path.**

Answer: Yes — dynamic segments can nest at successive folder levels, each contributing a separate key to `params`. `app/shop/[category]/[product]/page.tsx` captures both `category` and `product` from a request like `/shop/electronics/headphones`.

The trap: assuming only one dynamic segment is allowed per route, or not knowing how the resulting `params` object's shape maps to the nested bracket folders.

**Q (Medium): Is `params` available in `layout.tsx` too, or only in `page.tsx`?**

Answer: A layout receives `params` for its own route segment (if that segment is dynamic) — but unlike `page.tsx`, it never receives `searchParams`, for the persistence reasons covered in the nested-layouts topic.

The trap: assuming `params` and `searchParams` are always available together as a pair — they're not; the split is deliberate.

**Q (Low): What TypeScript type would you give `params` for `app/blog/[slug]/page.tsx` in Next.js 15?**

Answer: `Promise<{ slug: string }>`.

The trap: writing `{ slug: string }` without the `Promise` wrapper — correct for pre-15 code, incorrect and a compile error against Next.js 15's actual runtime contract.

---

## Self-Assessment

- [ ] Can write the correct Next.js 15 type signature for `params` from memory
- [ ] Can explain why `params`/`searchParams` becoming Promises isn't just a stylistic change
- [ ] Can trace what `params` resolves to for a route with multiple nested dynamic segments
- [ ] Knows layouts receive `params` for their own segment but never `searchParams`
- [ ] Can distinguish a path-based dynamic segment from a query-string `searchParams` value

---
*Next: Catch-all & optional catch-all segments `[...slug]` / `[[...slug]]` — dynamic segments that capture an arbitrary number of path parts instead of exactly one.*
