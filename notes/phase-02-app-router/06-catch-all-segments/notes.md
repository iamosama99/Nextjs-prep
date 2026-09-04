# Catch-All & Optional Catch-All Segments (`[...slug]` / `[[...slug]]`)

## Quick Reference

| Syntax | Matches | Does it match the base route with zero extra segments? |
|---|---|---|
| `[slug]` | Exactly one segment | N/A — always requires exactly one |
| `[...slug]` (required catch-all) | One **or more** segments | No — `/docs` alone 404s |
| `[[...slug]]` (optional catch-all) | Zero or more segments | Yes — `/docs` matches too |

`params.slug` resolves to a `string[]` for both catch-all forms (`Promise<string[]>` in Next.js 15, per Topic 5).

## Where Does This Run?

Same as any dynamic segment (Topic 5) — server-side, per-request, resolved as part of rendering.

## What Is This?

A dynamic segment normally captures exactly one path part. A **catch-all segment**, written `[...slug]`, instead captures *all remaining* path parts from that point on as an array. `app/docs/[...slug]/page.tsx` matches `/docs/a`, `/docs/a/b`, and `/docs/a/b/c` alike — `params.slug` is `["a"]`, `["a","b"]`, or `["a","b","c"]` respectively.

An **optional catch-all**, written with double brackets — `[[...slug]]` — does everything a required catch-all does, plus it *also* matches the base route itself with zero extra segments (`params.slug` is then `undefined` or `[]`).

> **Check yourself:** Does `app/docs/[...slug]/page.tsx` match a request to `/docs` with no trailing path at all?

## Why Does It Exist?

Some route structures genuinely have unbounded, variable depth that a fixed sequence of `[category]/[product]`-style segments can't express — a documentation site where pages can nest arbitrarily deep, a CMS-driven page tree with editor-controlled structure, or a file-browser-style UI mirroring an arbitrary folder hierarchy. Catch-all segments let one route file handle every depth of that structure, receiving the full remaining path as an array to interpret however the app needs (usually to look up content by that path in a CMS or database).

## How It Works

```tsx
// app/docs/[...slug]/page.tsx
export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // slug is e.g. ["getting-started", "installation"] for /docs/getting-started/installation
  const content = await getDocContent(slug.join('/'));
  return <Article content={content} />;
}
```

**The required-vs-optional distinction is the detail interviewers probe most.** `[...slug]` requires at least one path segment after `/docs` — a request to exactly `/docs` does not match this route at all and falls through to a 404 (or whatever other route, if any, actually owns `/docs`). `[[...slug]]` extends the match to cover that zero-segment case too, which is the right choice whenever the "root" of the catch-all tree (`/docs` itself) should render *something* rather than 404 — commonly, a docs homepage or index.

**Precedence against other route types:** when multiple route patterns could technically match the same request, Next.js resolves the *most specific* match first — a static segment (`app/docs/getting-started/page.tsx`) beats a dynamic segment (`[slug]`), which beats a catch-all (`[...slug]`). This lets you carve out specific, individually-customized pages inside an otherwise catch-all-driven section without any explicit priority configuration.

> **Check yourself:** If both `app/docs/faq/page.tsx` and `app/docs/[...slug]/page.tsx` exist, which one handles a request to `/docs/faq`?

## Gotchas

- **Required catch-all not matching its own base path is the single most common surprise here** — `[...slug]` needs *at least one* segment; reaching `/docs` itself with only `[...slug]` defined 404s, which is unintuitive the first time you hit it. The fix, if the base path should render something, is switching to `[[...slug]]`.
- **You can't have two catch-all routes at the same folder level differing only in name** (`[...slug]` and `[...path]` in the same position) — Next.js requires route segment names to be consistent at a given position across the route tree, and having two conflicting catch-all definitions at the same level is an error.
- **Static routes always win over dynamic ones at the same level**, which is easy to forget when debugging why a seemingly-matching catch-all isn't the one actually handling a request — check for a more specific static or single-dynamic-segment route first.

## Interview Questions

**Q (High): What's the difference in matching behavior between `[...slug]` and `[[...slug]]`?**

Answer: `[...slug]` (required catch-all) matches one or more path segments after the point where it appears — it does not match the route with zero additional segments. `[[...slug]]` (optional catch-all) matches everything the required version does, plus the base route itself with no extra segments, in which case `params.slug` comes back `undefined` (or an empty array, depending on how you destructure it).

The trap: treating the two as interchangeable, or not knowing which one to reach for when the "root" of a catch-all section needs to render its own content.

**Q (High): Does `app/docs/[...slug]/page.tsx` match a request to `/docs` exactly? What would you need to change for it to?**

Answer: No — a required catch-all needs at least one segment beyond `/docs`, so `/docs` alone doesn't match and 404s (unless some other route file explicitly owns `/docs`). Changing the folder to `[[...slug]]` (optional catch-all) would make `/docs` itself match too.

The trap: assuming "catch-all" means "catches everything including nothing," when the required form specifically excludes the zero-segment case by design.

**Q (Medium): How does Next.js decide precedence when a static route, a dynamic segment, and a catch-all route could all technically match the same request path?**

Answer: Most specific wins: a static, literal segment (`app/docs/faq/page.tsx`) is matched before a single dynamic segment (`[slug]`), which is matched before a catch-all (`[...slug]`). This lets you define specific, individually customized pages within a section that's otherwise handled generically by a catch-all, without any manual route-ordering configuration.

The trap: assuming route matching is purely first-defined-wins or otherwise order-dependent based on file creation order rather than specificity-based.

**Q (Medium): What TypeScript type does `params.slug` have for a catch-all route in Next.js 15?**

Answer: `Promise<{ slug: string[] }>` for the route's `params` prop as a whole — `slug` itself is a `string[]`, an array of the captured path segments, in contrast to a single dynamic segment's plain `string`.

The trap: typing it as `string` (copying the single-dynamic-segment pattern) instead of `string[]`.

**Q (Low): Name a real product feature where a catch-all route is the natural fit.**

Answer: A documentation site with arbitrarily nested pages, a CMS-driven marketing site where editors control page hierarchy without engineering involvement, or a file-browser UI that mirrors an actual folder structure of unpredictable depth — any case where the route "shape" is data-driven rather than fixed by the codebase.

The trap: struggling to name a concrete example beyond "when you need a wildcard," suggesting the concept is understood abstractly but not connected to real use.

---

## Self-Assessment

- [ ] Can state, without notes, the exact matching difference between `[...slug]` and `[[...slug]]`
- [ ] Can explain why a required catch-all doesn't match its own base path
- [ ] Can state the specificity order Next.js uses among static, dynamic, and catch-all routes
- [ ] Can write the correct TypeScript type for a catch-all route's `params` in Next.js 15
- [ ] Can name a concrete real-world use case for a catch-all route

---
*Next: Parallel routes `@slot` — a mechanism for rendering more than one independent page-like segment simultaneously within the same layout, something no combination of dynamic or catch-all segments alone can express.*
