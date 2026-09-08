# Metadata API — Static Metadata Export

**Demo:** `app/playground/phase-08-metadata-seo-assets/01-static-metadata/` — a layout defining
`title.template`/`title.default`/`description`/`openGraph`, plus three child routes (`no-title`,
`absolute-title`, `templated-child`) and the layout's own `page.tsx`, each isolating one piece of title
resolution. Every `<title>`/`<meta>` claim below was verified with real `curl` output against a running
dev server, and every route's static classification (`○`) was confirmed with a real `npm run build`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `export const metadata: Metadata = {...}` in `layout.tsx`/`page.tsx` | A plain object Next.js reads at render time to generate `<head>` tags | No JSX, no `next/head` — just data |
| `title: { template: '%s \| Acme', default: 'Acme' }` | A prefix/suffix applied to a **child segment's** title | Verified: has **no effect** on a title set in the same segment's own `page.tsx` |
| A `page.tsx` with no `metadata` export at all | Falls back to the closest ancestor's `title.default` | Verified: renders the layout's default title untouched by any template |
| `title: { absolute: '...' }` | A title that ignores every ancestor's `title.template` | Verified: renders exactly the given string, no suffix |
| A nested field like `openGraph` redefined in a child segment | **Replaces** the parent's entire `openGraph` object — not a deep merge | The parent's `openGraph.description` silently disappears unless re-declared |

## Where Does This Run?

Entirely server-side. The `metadata` object export is only supported in Server Components — it's resolved before the page renders, since Next.js needs the finished `<head>` tags to be part of the response it sends (or, for `generateMetadata`, part of what it streams — Topic 2's concern, not this one, since static metadata by definition doesn't depend on a request). There is no client-side equivalent: metadata never re-runs on the client, and a Client Component cannot export it at all.

## What Is This?

The `metadata` object is a plain, statically-known export — a `const`, not a function — that Next.js reads from a `layout.tsx` or `page.tsx` and turns into the corresponding `<head>` tags (`<title>`, `<meta name="description">`, Open Graph tags, and so on) automatically, without you writing any markup yourself:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Blog',
  description: 'Thoughts on Next.js',
}

export default function Layout() { /* ... */ }
```

"Static" specifically means the values don't depend on anything only known at request time — no `params`, no `cookies()`, no `fetch`. If a value needs any of that, it belongs in `generateMetadata` instead (Topic 2), which has the same shape of return value but is an async function.

> **Check yourself:** If a `page.tsx` needs to render an interactive Client Component but also needs a static `title`, does the whole file have to become a Client Component, and if not, what's the actual structure?

## Why Does It Exist?

Pages Router required manually rendering a `<Head>` component (from `next/head`) on every single page, with no automatic inheritance — a shared `<meta>` tag meant either repeating it everywhere or building your own composition helper. The App Router's file-convention `metadata` export replaces that by making metadata **declarative and structurally inherited**: define shared fields once in a root or section layout, and every page beneath it picks them up automatically unless it overrides them — mirroring how layouts themselves already nest and compose UI.

Being restricted to Server Components isn't incidental — metadata has to be resolved *before* the page's HTML is finalized (so the tags land in the actual response, not bolted on after hydration), and only server-rendered output can guarantee that ordering.

## How It Works

### Title resolution: `string`, `default`, `template`, `absolute`

`title` can be a plain string, or an object with up to three keys, each with a distinct job:

- **`title.default`** — the fallback title used by a child segment that sets no `title` of its own. Verified: `no-title/page.tsx` exports no `metadata` at all, and its `<title>` renders as exactly the layout's `default` (`Static Metadata Demo`) — untouched by any template.
- **`title.template`** — a `%s`-containing pattern (e.g. `'%s | Acme'`) that wraps a **child segment's** own title. It requires `title.default` to be set alongside it, and it has no effect on a segment that defines no title at all.
- **`title.absolute`** — a title that ignores every ancestor's `title.template`, rendering exactly as given. Verified: `absolute-title/page.tsx` sets `title: { absolute: 'Ignores The Template' }` and renders `<title>Ignores The Template</title>` — no ` | Static Metadata Demo` suffix.

### The gotcha the demo surfaces directly: template vs. same-segment title

This is the one worth internalizing precisely, because it's easy to get backwards: **a `layout.tsx`'s `title.template` does not apply to a `title` set by the `page.tsx` in that same route segment.** A `layout.tsx` and the `page.tsx` sitting directly beside it occupy the *same* segment in the route tree — siblings, not parent and child — and a template only augments titles from a genuine child segment one level deeper.

Verified directly: this topic's own `01-static-metadata/page.tsx` sets `title: 'Overview'`, sitting beside `01-static-metadata/layout.tsx`'s `title.template: '%s | Static Metadata Demo'`. The rendered result is `<title>Overview</title>` — the template is silently skipped. The nested `templated-child/page.tsx`, one real segment deeper, sets the identical shape of title (`title: 'Templated Child'`) and correctly renders `<title>Templated Child | Static Metadata Demo</title>`.

> **Check yourself:** Given a root layout with `title.template: '%s | Acme'` and `title.default: 'Acme'`, and that root layout's own `page.tsx` (the home page) setting `title: 'Home'`, what does the home page's `<title>` actually render as?

### Merging vs. inheriting across segments

Next.js evaluates `metadata` exports from the root segment down to the page, and **shallowly merges** them: a key a child segment redefines *replaces* the parent's value for that key entirely; a key the child leaves alone is *inherited* untouched. This is shallow, not deep — verified directly: the layout here sets both `description` and `openGraph: { title, description }`; the index page redefines neither, so both are inherited verbatim into the rendered `<head>` (confirmed via the real `og:description` meta tag matching the layout's value exactly, not a merged or blank one).

The trap this shallow-merge behavior sets up: if a child segment redefines `openGraph` at all — even just to change `openGraph.title` — the *entire* `openGraph` object from the parent is replaced, not patched. Any sibling field like `openGraph.description` the parent had set silently vanishes unless the child explicitly repeats it. The docs' own fix for wanting to share some nested fields while overriding others is to pull the shared piece into its own JS object/constant and spread it into each segment's `metadata` — there's no built-in deep merge.

### File-based metadata takes priority

A `favicon.ico`, `opengraph-image.jpg`, `robots.txt`, or `sitemap.xml` file (Topics 4–8) is a competing way to produce the same metadata, and when both exist for the same field, **the file-based convention wins** over whatever the `metadata` object declares.

## The Old vs New Approach

Pages Router had no structural metadata system at all — every page manually rendered `next/head`'s `<Head>` component with its own `<title>`/`<meta>` JSX, and nothing was inherited; a site-wide tag meant repeating the same `<Head>` contents (or building a shared component) on every single page. The App Router's `metadata` export removes that repetition entirely by making inheritance and merging automatic, at the cost of the flexibility of writing arbitrary head markup directly (see the "Unsupported Metadata" gotcha below).

## Gotchas

- **`title.template` does not apply within the same route segment as the `layout.tsx` that defines it** — verified directly above. A common mistake is expecting a page's plain string `title` to get the parent layout's suffix when both files live in the same folder; it only works one segment deeper.
- **Nested fields (`openGraph`, `robots`, `twitter`, etc.) are shallow-merged, not deep-merged** — redefining any part of one of these objects in a child segment silently discards every sibling field the parent had set for that same object, unless explicitly re-included.
- **You cannot export both `metadata` and `generateMetadata` from the same route segment** — pick one per segment; a segment that needs any request-dependent value uses `generateMetadata` for everything in that segment, not a mix.
- **A Client Component cannot export `metadata` at all.** If a page needs both static metadata and client-side interactivity, the fix is structural: keep `page.tsx` as a Server Component exporting `metadata`, and move the interactive piece into a separate `'use client'` file that the Server Component renders as a child.
- **Not everything belongs in `metadata`.** Things like `<base>`, `<noscript>`, `<style>`, or `<link rel="preload">` have no field in the Metadata API — the docs' own "Unsupported Metadata" table points to rendering those directly in the layout/page, or to `ReactDOM.preload`/`preconnect`/`prefetchDNS` for resource hints.
- **File-based metadata conventions override the `metadata` object for the same field** — an `opengraph-image.jpg` file wins over an `openGraph.images` array declared in code for that same route.

## Interview Questions

**Q (High): Why doesn't `title.template` apply to a title set in the same `layout.tsx`/`page.tsx` pair's own `page.tsx`?**

Answer: Because a `layout.tsx` and its sibling `page.tsx` occupy the *same* route segment in the tree, not a parent/child relationship — `title.template` is explicitly scoped to augment titles from genuine *child* segments, one level of nesting deeper. Verified directly: an index `page.tsx` setting `title: 'Overview'` next to a `layout.tsx` setting `title.template: '%s | Demo'` rendered as plain `Overview`, while an identically-shaped title one segment deeper correctly picked up the template.

The trap: assuming "the layout is the parent of the page" means the page's title always gets templated — the docs are explicit that same-segment `layout.tsx`/`page.tsx` pairs don't have that relationship for this purpose, and it's easy to only discover this by testing it directly, as this demo did.

**Q (High): A parent layout sets `openGraph: { title: 'Acme', description: 'Acme is a company' }`. A child page sets `openGraph: { title: 'About' }`. What does the child page's final `openGraph` metadata actually contain?**

Answer: Just `{ title: 'About' }` — no `description`. Metadata merging across segments is shallow: a redefined top-level key entirely replaces the parent's value for that key, it doesn't merge field-by-field within it. The parent's `openGraph.description` is not inherited once the child touches `openGraph` at all.

The trap: assuming Next.js does a deep/recursive merge of nested metadata objects the way you might expect from, say, Lodash's `merge`. It doesn't — the fix for wanting partial inheritance is to factor the shared fields into a separate constant and spread it into each segment.

**Q (Medium): Why can only Server Components export `metadata` or `generateMetadata`?**

Answer: Metadata has to be fully resolved before (or, for streaming cases, alongside) the HTML response is finalized, so the tags actually land in what gets sent to the client and to bots that don't execute JavaScript. Only server rendering can guarantee that ordering — a Client Component's output isn't available until after hydration on the client, which is too late for metadata that needs to already be in the document.

The trap: trying to add `metadata` to a file that also needs `'use client'` for interactivity, and not realizing the fix is to split the file rather than find a client-side metadata API (there isn't one).

**Q (Medium): What's the difference between `title.default` and `title.absolute`, given both can produce the exact same rendered title string?**

Answer: `title.default` is a *fallback* — it only takes effect when a child segment defines no `title` at all, and it still participates normally in whatever template an ancestor might apply to a title a child *does* set (it doesn't affect that; only the child's own title choice does). `title.absolute`, by contrast, is set *by* a segment specifically to opt that segment's own title out of any ancestor's `title.template`, even though that segment otherwise has a title.

The trap: treating "no template applied" as evidence of which mechanism is in play — both `title.default` (when nothing overrides it) and `title.absolute` can render without a template suffix, but for structurally different reasons, and mixing them up leads to wrong predictions about what a *different* child segment (one that sets a plain string `title`) will render as.

**Q (Low): Why does file-based metadata (like `opengraph-image.jpg`) take priority over the same field declared in the `metadata` object?**

Answer: It's a documented precedence rule — when both a file convention and an object field would produce the same metadata output, Next.js resolves the file-based version and it wins. Practically, this avoids two competing declarations silently fighting over which one renders (the docs also note the file-based approach is generally preferred, since it doesn't require keeping a config export in sync with an actual asset file).

The trap: adding both an `opengraph-image.jpg` file *and* an `openGraph.images` field expecting them to combine, then being confused when only the file-based one shows up.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state, precisely, why a page's own `title` sometimes doesn't get its sibling layout's `title.template` applied
- [ ] Can explain the difference between `title.default` and `title.absolute` without needing to run the demo
- [ ] Can explain why metadata merging across segments is described as "shallow" and give a concrete example where that bites
- [ ] Can explain why `metadata`/`generateMetadata` are Server-Component-only, and what to do when a page also needs client interactivity
- [ ] Knows file-based metadata conventions override the equivalent `metadata` object field

---
*Next: `generateMetadata` — dynamic, data-driven metadata — the async counterpart to this topic, for titles/descriptions that depend on route params, external data, or the parent segment's resolved metadata.*
