# Dynamic Segments `[id]`

## Quick Reference

| Fact | Detail |
|---|---|
| Syntax | `app/blog/[slug]/page.tsx` captures the segment as `slug` |
| Access | Via the `params` prop passed to `page.tsx` (and `layout.tsx`, for its own segment) |
| Async since | `params`/`searchParams` became **Promises** in Next.js 15; as of **Next.js 16, the old synchronous access is removed entirely** — no compatibility fallback |
| Idiomatic typing | `PageProps<'/blog/[slug]'>` — globally available helper, no manual `Promise<{ slug: string }>` needed |
| Multiple dynamic segments | Allowed at different nesting levels, e.g. `[category]/[product]` |

## Where Does This Run?

Server — `params` is resolved as part of rendering the Server Component for that route (or inside a Route Handler, Phase 6). The *value itself* comes from the incoming request's URL, so it's inherently per-request, dynamic data — not something available at build time unless you've explicitly pre-generated it (`generateStaticParams`, Phase 3).

## What Is This?

A folder name wrapped in square brackets — `[slug]`, `[id]`, `[username]` — captures whatever value actually appears in that position of the URL and exposes it to the route as a parameter, instead of you writing manual URL parsing or regex matching. `app/blog/[slug]/page.tsx` matches any request like `/blog/hello-world` or `/blog/my-post`, with `slug` bound to `"hello-world"` or `"my-post"` respectively.

> **Check yourself:** For the route file `app/shop/[category]/[product]/page.tsx`, what would `params` contain for a request to `/shop/electronics/headphones`?

## Why Does It Exist?

Almost every real app has routes whose exact path can't be enumerated in advance — a blog post's slug, a product's ID, a user's username. Dynamic segments let the file-based routing convention (Topic 1) extend to this case without breaking its core idea: the folder structure still fully describes the shape of the URL space, just with a named placeholder instead of a literal string, and Next.js handles extracting and typing the actual value for you.

## How It Works

```tsx
// app/blog/[slug]/page.tsx  — manual typing, still valid, still what the helper below expands to
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <h1>{slug}</h1>;
}
```

The same thing, using the idiomatic, currently-recommended pattern — the `PageProps` helper introduced in Phase 1, Topic 5, generated automatically from your actual route structure:

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const query = await props.searchParams;
  return <h1>{slug}</h1>;
}
```

Both compile to the same shape; `PageProps<'/blog/[slug]'>` just derives `{ slug: string }` for you from the literal route string instead of you writing it by hand — which matters because a hand-written type doesn't automatically update if the folder gets renamed from `[slug]` to `[id]`, while the generated one does.

**The Promise itself is the detail most worth being precise about, including its version history.** Prior to Next.js 15, `params` (and `searchParams`) were plain synchronous objects passed directly as props. Next.js 15 introduced the `Promise`-based API but kept a **temporary** synchronous fallback for backward compatibility (accessing `params.slug` directly still worked, with a deprecation warning). **Next.js 16 removes that fallback entirely** — synchronous access is no longer possible at all, only `await params` (or React's `use(params)` in a Client Component) works. If you see or write code assuming a lingering sync option "just in case," that assumption is now wrong. This wasn't a stylistic API change — it's tied to enabling more granular rendering and caching. By making `params`/`searchParams` asynchronous, Next.js can start producing a route's static, non-parameter-dependent shell immediately, without being blocked on resolving the specific dynamic value first, and stream in the parameter-dependent parts once they're available — this is part of the foundation the Cache Components model (Phase 3) builds on.

**Multiple dynamic segments** simply nest, each contributing its own key to `params`:

```
app/shop/[category]/[product]/page.tsx
```
matches `/shop/electronics/headphones` with `params` resolving to `{ category: "electronics", product: "headphones" }`.

**A layout can also receive `params`** for its own segment — if `app/blog/[slug]/layout.tsx` exists, it gets `Promise<{ slug: string }>` too (typeable via `LayoutProps<'/blog/[slug]'>`, Topic 2) — but never `searchParams`, per the persistence reasoning covered in Topic 2.

> **Check yourself:** Why does making `params` a Promise instead of a plain object help Next.js render part of a page before the dynamic route parameter is even resolved?

## Gotchas

- **Forgetting to `await params`** — TypeScript will catch this at compile time if `params` is correctly typed as a `Promise`, but it's a genuinely easy thing to miss when migrating code or copying older examples that assumed a synchronous object. On Next.js 16 specifically there's no fallback left to save you — the temporary sync-access compatibility from the Next.js 15 transition period is gone.
- **Confusing route params with `searchParams`.** `[slug]` captures part of the *path* (`/blog/hello-world`); `searchParams` captures the *query string* (`?sort=asc`) — they're distinct mechanisms serving different parts of the URL, and only `page.tsx`/Route Handlers get `searchParams` at all (Topic 2).
- **Segment names must be consistent across parallel dynamic routes referencing the same conceptual value** — inconsistent naming (`[id]` in one place, `[postId]` in another for what's meant to be the same concept) doesn't break anything mechanically but undermines the type-safety benefit `typedRoutes` (Phase 1, Topic 5) is meant to provide.

## Interview Questions

**Q (High): How do you access a dynamic route segment's value inside `page.tsx`, and what changed about this across Next.js 15 and 16?**

Answer: The segment's captured value is available via the `params` prop, awaited (or read with React's `use()` in a Client Component). Next.js 15 introduced `params`/`searchParams` as `Promise`s but kept a temporary, deprecated synchronous fallback for backward compatibility during the transition. Next.js 16 removes that fallback completely — asynchronous access is now the only option, full stop.

The trap: writing (or reading) `params.slug` directly without awaiting, which either fails to compile under correct typing or, in looser typing, produces a runtime bug where `slug` is `undefined`; also citing the "temporary sync compatibility" as if it still exists on current Next.js.

**Q (Medium): What does `PageProps<'/blog/[slug]'>` give you over manually writing `{ params: Promise<{ slug: string }> }`?**

Answer: The same resulting shape, generated automatically from the actual route folder structure during `next dev`/`next build`/`next typegen`, rather than hand-typed. The practical benefit is that it can't silently drift from reality — renaming `[slug]` to `[id]` on disk updates the generated type immediately, whereas a hand-written type would keep compiling against the old, now-wrong key until someone notices.

The trap: treating it as purely a convenience/shorthand rather than a correctness guarantee against route-and-type drift.

**Q (High): Why did Next.js make `params`/`searchParams` asynchronous instead of plain objects?**

Answer: To decouple a route's static, parameter-independent shell from the specific dynamic value — making these Promises lets Next.js begin producing and streaming parts of a page that don't depend on `params`/`searchParams` before those values are actually resolved, rather than being forced to block the entire render on them upfront. This is the underlying mechanism that Partial Prerendering (Phase 11) builds on.

The trap: guessing "just to match Server Actions being async" or another surface-level reason, rather than tying it to the specific rendering/streaming capability it enables.

**Q (Medium): Can a single route have multiple dynamic segments? Give an example path.**

Answer: Yes — dynamic segments can nest at successive folder levels, each contributing a separate key to `params`. `app/shop/[category]/[product]/page.tsx` captures both `category` and `product` from a request like `/shop/electronics/headphones`.

The trap: assuming only one dynamic segment is allowed per route, or not knowing how the resulting `params` object's shape maps to the nested bracket folders.

**Q (Medium): Is `params` available in `layout.tsx` too, or only in `page.tsx`?**

Answer: A layout receives `params` for its own route segment (if that segment is dynamic) — but unlike `page.tsx`, it never receives `searchParams`, for the persistence reasons covered in the nested-layouts topic.

The trap: assuming `params` and `searchParams` are always available together as a pair — they're not; the split is deliberate.

**Q (Low): What TypeScript type would you give `params` for `app/blog/[slug]/page.tsx`, written manually?**

Answer: `Promise<{ slug: string }>` — or, using the generated helper instead of writing it by hand, `PageProps<'/blog/[slug]'>`.

The trap: writing `{ slug: string }` without the `Promise` wrapper — correct for pre-15 code, incorrect and a compile error against the current runtime contract.

---

## Self-Assessment

- [ ] Can write the correct type signature for `params` from memory, manual and via `PageProps`
- [ ] Can explain why `params`/`searchParams` becoming Promises isn't just a stylistic change
- [ ] Knows Next.js 16 fully removed the Next.js 15 temporary synchronous-access fallback
- [ ] Can trace what `params` resolves to for a route with multiple nested dynamic segments
- [ ] Knows layouts receive `params` for their own segment but never `searchParams`
- [ ] Can distinguish a path-based dynamic segment from a query-string `searchParams` value

---
*Next: Catch-all & optional catch-all segments `[...slug]` / `[[...slug]]` — dynamic segments that capture an arbitrary number of path parts instead of exactly one.*
