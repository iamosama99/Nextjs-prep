# `generateStaticParams` & Prerendering Dynamic Segments

**Demo:** `app/playground/phase-03-rendering-caching/08-generate-static-params` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/08-generate-static-params`, then click through to a listed category (`fiction`) and an unlisted one (`mystery`).

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `generateStaticParams()` returning `[{ slug: 'a' }, { slug: 'b' }]` | The list of param values to prerender at build time | Every other value is still servable — just not prerendered ahead of time |
| Returning `[]` (empty array) | Pre-16: "prerender nothing, do it all at runtime" | Under Cache Components: a **build error** — at least one param is required |
| `dynamicParams = false` | Pages Router / pre-16: 404 anything not listed | **Not supported** under Cache Components — delete the export; call `notFound()` in the page instead |
| Awaiting `params` inside a `<Suspense>`-wrapped child, not at the top | Lets Next.js still produce a shell for *unlisted* params | Same "push the await down" pattern from Topic 1, now load-bearing for this API specifically |

## Where Does This Run?

`generateStaticParams` itself runs at build time (and, per Next.js's own dev-mode convenience, on-demand in `next dev` when you navigate to a route it covers). What it *produces* — the list of params — determines which concrete versions of a dynamic route get prerendered as part of the static shell described in Topic 1.

## What Is This?

For a route with a dynamic segment (`app/blog/[slug]/page.tsx`), Next.js doesn't know ahead of time which `slug` values exist — that's data, not a compile-time fact. `generateStaticParams` is how you tell it: return an array of objects, one per param combination you want prerendered, and Next.js builds a concrete version of the route for each.

```tsx
export async function generateStaticParams() {
  const posts = await fetch('https://.../posts').then((res) => res.json())
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  // ...
}
```

For multiple dynamic segments, each object supplies every segment's value: `{ category: 'a', product: '1' }` for `/products/[category]/[product]`. For a catch-all (`[...slug]`), the value is an array: `{ slug: ['a', '1'] }`.

> **Check yourself:** Without looking, write the return-type shape `generateStaticParams` needs for the route `/products/[...slug]`.

## Why Does It Exist?

Without it, a dynamic route has no way to become part of the build-time static shell at all — every visit would have to render from scratch. `generateStaticParams` is the App Router's replacement for the Pages Router's `getStaticPaths`, and it exists to answer the exact same question that function did: *which of the infinitely many possible param values are worth precomputing, versus generating on demand?*

## How It Works

### Prerender a subset, not all-or-nothing

You don't need to (and usually shouldn't) return every possible value. Returning your ten most popular blog posts prerenders those ten; every other slug is still a completely valid, servable route — it's just not sitting in the build output ahead of time (Topic 9 covers exactly what happens for those).

```tsx
export async function generateStaticParams() {
  const posts = await fetch('https://.../posts').then((res) => res.json())
  return posts.slice(0, 10).map((post) => ({ slug: post.slug })) // top 10 only
}
```

### The Cache Components-specific rules

Two behaviors changed specifically because Cache Components needs to *validate* that a route produces a non-empty static shell:

1. **An empty array is now a build error**, not a valid "defer everything to runtime" signal. Pre-16, `return []` meant "prerender nothing, generate all paths on first visit" — a legitimate pattern. Under Cache Components, `generateStaticParams` must return **at least one** param combination, or the build fails with `empty-generate-static-params`. If you genuinely don't know any param values ahead of time, the docs suggest a placeholder (`[{ slug: '__placeholder__' }]`) handled with `notFound()` in the page — though this weakens the validation's usefulness, so it's a last resort, not a default habit.
2. **`dynamicParams = false` is not supported** and fails the build outright. Pre-16, this was how you told Next.js to 404 any param not returned by `generateStaticParams`. Under Cache Components, params you didn't list are always servable (they become App Shell-backed, Topic 9) — if you need the equivalent of a 404 for "this ID doesn't exist," call `notFound()` explicitly inside the page once you've looked the value up and found nothing.

### Awaiting `params` matters even for listed values

This is easy to get backwards: even for a `slug` value your own `generateStaticParams` *does* list, awaiting `params` at the top of the page (rather than inside a `<Suspense>`-wrapped child) still ties that whole render to one concrete URL — which is exactly wrong for the *App Shell* Next.js wants to build for the params you *didn't* list. The fix from Topic 1 ("maximize the static shell") is what makes both cases — listed and unlisted params — share the same reusable shell structure:

```tsx
// Layout never awaits params directly, for EITHER known or unknown categories
export default function CategoryLayout(props: LayoutProps<'/[category]'>) {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <CategoryHeader params={props.params} />
      </Suspense>
      {props.children}
    </div>
  )
}

async function CategoryHeader({ params }: Pick<LayoutProps<'/[category]'>, 'params'>) {
  const { category } = await params
  // ...
}
```

### Nested dynamic segments: bottom-up or top-down

For `/products/[category]/[product]`, you can generate both segments' params from the deepest page (bottom-up — one function returns objects with both keys), or generate the parent's params in the layout and let the child's `generateStaticParams` receive them as an argument to generate its own (top-down). A child segment's `generateStaticParams` runs once *per* param set the parent generated — useful when the child's valid values genuinely depend on which parent was chosen (e.g., which products exist in which category).

### `fetch` memoization applies here too

A `fetch` call inside `generateStaticParams` for the same URL used elsewhere (the page itself, `generateMetadata`) is deduplicated by Topic 3's Request Memoization, same as any other Server Component context — no special handling needed to avoid a redundant request.

## Gotchas

- **`generateStaticParams` can only generate params for segments at or below its own position** — a page can generate both `[category]` and `[product]`; a layout at `[category]` can only generate `[category]`, never a child segment's params.
- **Placeholder params are a real but weak escape hatch.** Using a fake value to satisfy the "at least one param" rule technically passes the build, but defeats the purpose of Cache Components validating your route actually renders correctly — reach for this only when you truly cannot supply a real value.
- **This validation is specifically about Cache Components.** Without `cacheComponents: true`, an empty array and `dynamicParams` both still work the old way (Topic 11 covers this contrast in full).

## Interview Questions

**Q (High): Under Cache Components, `generateStaticParams` returning `[]` used to be valid — what happens now, and why did this change?**

Answer: It's now a build error (`empty-generate-static-params`). Cache Components validates that a dynamic route produces a genuine, non-empty static shell — an empty array gave it nothing to prerender and nothing to validate against, silently deferring everything to runtime with no build-time signal that the route is actually correctly structured. Requiring at least one param lets Next.js prerender that one concrete instance and confirm the route doesn't, say, accidentally read `cookies()` or `searchParams` unguarded.

The trap: assuming this is an arbitrary new restriction rather than connecting it to *why* Cache Components needs validation targets in the first place.

**Q (High): You want unlisted param values to 404 instead of rendering. Pre-16 you'd set `dynamicParams = false`. What's the Cache Components equivalent?**

Answer: `dynamicParams` is not supported at all under Cache Components and fails the build if exported. Since Cache Components always allows unlisted params to render (backed by the App Shell — Topic 9), the equivalent behavior is explicit: look up the value in the page component, and call `notFound()` when it doesn't resolve to real data, rather than relying on a route-segment config to reject it upfront.

The trap: trying to keep the old config and being surprised by a hard build failure rather than a graceful fallback.

**Q (Medium): A page awaits `params` at the very top of its component, even for a `slug` that its own `generateStaticParams` explicitly lists. Why is this still a problem worth fixing?**

Answer: Awaiting at the top ties the entire render to one concrete URL, which prevents Next.js from producing the reusable, URL-independent **App Shell** — the version of the page meant to be served instantly to visitors requesting params that *weren't* listed. Even though the listed slug's own prerender works fine either way, the unlisted-params case depends on the component being structured so `params` resolves inside a `<Suspense>`-wrapped leaf, not awaited at the top — so the fix isn't optional just because "my case is covered."

The trap: reasoning only about the params you explicitly listed and missing that the component's structure has consequences for the params you didn't.

**Q (Medium): For `/products/[category]/[product]`, what's the difference between generating both segments' params "bottom-up" versus "top-down"?**

Answer: Bottom-up means the deepest segment's `generateStaticParams` (the `[product]` page) returns objects with both `category` and `product` keys directly, computed independently. Top-down means the `[category]` layout generates its own params first, and the `[product]` page's `generateStaticParams` receives each generated `category` as an argument, using it to fetch and generate only that category's products. Top-down is useful specifically when the child's valid values genuinely depend on which parent value was chosen — you'd otherwise have to redundantly recompute or filter that relationship in the bottom-up version.

The trap: not realizing a child `generateStaticParams` can receive the parent's generated params as an argument at all — this composition is easy to miss.

**Q (Low): Does a `fetch` call inside `generateStaticParams` benefit from Request Memoization if the same URL is also fetched in the page component?**

Answer: Yes — Request Memoization (Topic 3) applies across `generateStaticParams`, `generateMetadata`, layouts, pages, and Server Components uniformly; an identical `fetch` call in more than one of these during the same render/build pass is deduplicated automatically.

The trap: assuming memoization is scoped only to "regular" component rendering and doesn't extend to the special `generate`-prefixed functions.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write `generateStaticParams` for a single dynamic segment, and for a catch-all segment
- [ ] Can explain why an empty array is now a build error under Cache Components
- [ ] Can explain what replaces `dynamicParams = false` under Cache Components
- [ ] Can explain why awaiting `params` at the top of a page matters even for a listed value
- [ ] Can explain the difference between bottom-up and top-down generation for nested dynamic segments

---
*Next: ISR with Cache Components — what actually happens, step by step, when a visitor requests a param value `generateStaticParams` didn't list.*
