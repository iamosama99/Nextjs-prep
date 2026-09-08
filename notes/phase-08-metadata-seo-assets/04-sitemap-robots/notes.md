# `sitemap.ts` & `robots.ts` Generation

**Demo:** `app/robots.ts` and `app/sitemap.ts` (project root, per convention), plus a nested
`app/playground/phase-08-metadata-seo-assets/04-sitemap-robots/products/sitemap.ts` using
`generateSitemaps()` to split a 5-product list into three separate sitemap files. Every claim below —
the exact `robots.txt`/`sitemap.xml` output, the `generateSitemaps` chunk contents, the `id` parameter's
real runtime type, and the static/dynamic classification of each route — was verified with real `curl`
output and a real `npm run build`, including one classification this topic's own first draft got wrong
and had to re-test to explain.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `app/robots.ts` exporting a default `robots()` function | A special Route Handler that generates `/robots.txt` | No manual `Response` handling — return a plain object, Next.js formats the text |
| `app/sitemap.ts` exporting a default `sitemap()` function | A special Route Handler that generates `/sitemap.xml` | Same idea, XML instead of plain text |
| `generateSitemaps()` + a nested `sitemap.ts` | Splits one sitemap into multiple files at `.../sitemap/[id].xml` | Needed once a site has more URLs than one sitemap file should reasonably hold |
| `lastModified: new Date()` inside `sitemap()` | A **non-deterministic call**, same category as `Math.random()` | Verified: this alone forces the whole route dynamic (`ƒ`) under Cache Components — a literal date string keeps it static (`○`) |
| The `id` parameter `generateSitemaps` chunks are keyed by | A `string`, not a `number`, as of Next.js 16 | Verified directly: `typeof id === 'string'` at runtime, even though the docs' own example code does arithmetic on it as if it were numeric |

## Where Does This Run?

Entirely server-side, and — per the docs' own framing — as **Route Handlers**, not as page rendering. That distinction matters concretely: `robots.ts`/`sitemap.ts` follow the exact same static/dynamic/cached classification rules Phase 6 established for ordinary `route.ts` files (and, transitively, the same Cache Components rules Phase 3 established for any server code), rather than the Metadata-API-specific rules Topics 1–3 covered. There's no client-side counterpart — these files produce plain-text/XML responses a crawler fetches directly, never something a browser renders as UI.

## What Is This?

Two file conventions, each solving one piece of the classic "help search engines understand my site" problem:

- **`robots.ts`** generates `/robots.txt` — which crawlers are allowed to visit which paths, and where the sitemap lives.
- **`sitemap.ts`** generates `/sitemap.xml` — the actual list of URLs worth crawling, with optional freshness/priority hints.

Both live at the root of `app/` by convention (a `robots.txt`/`sitemap.xml` only means anything to crawlers at a site's root), and both are exported as a single default function returning a plain JS object/array — no manual XML or plain-text formatting required:

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://acme.com/sitemap.xml',
  }
}
```

> **Check yourself:** If `robots.ts` and `sitemap.ts` are described as "special Route Handlers," what does that imply about whether they can read `cookies()` or `headers()` the same way an ordinary `route.ts` can?

## Why Does It Exist?

Before these conventions, a `robots.txt`/`sitemap.xml` was either a hand-maintained static file (fine for a handful of pages, unmaintainable once a site has thousands of dynamically-generated routes like blog posts or product pages) or something bolted on with a custom server. The file-convention approach ties both directly into the App Router's routing and data layer: `sitemap.ts` can `await` a database query the same way any Server Component can, so the sitemap can never drift out of sync with what the app actually serves — no separate build step, no forgetting to regenerate it after adding content.

`generateSitemaps()` exists specifically for scale: search engines impose a per-file URL cap (the docs cite Google's 50,000), so a site with more URLs than that needs multiple sitemap files, and `generateSitemaps` is the mechanism for programmatically declaring how many and fetching each chunk's data on demand — directly analogous to `generateStaticParams` for ordinary dynamic routes.

## How It Works

### The basic shape, verified end to end

`app/robots.ts` in this demo returns per-agent rules (`Googlebot` gets a narrower disallow list, a catch-all `*` rule, and a `SeznamBot` rule using the `other` field for a non-standard `Request-Rate` directive), plus a `sitemap` pointer. The real rendered `/robots.txt`:

```
User-Agent: Googlebot
Allow: /
Disallow: /playground/phase-08-metadata-seo-assets/04-sitemap-robots/private/

User-Agent: *
Disallow: /playground/phase-08-metadata-seo-assets/04-sitemap-robots/private/

User-Agent: SeznamBot
Allow: /
Request-Rate: 10/1m

Sitemap: http://localhost:3000/sitemap.xml
```

Each rule becomes its own `User-Agent:` block, in array order; `other`'s keys pass through verbatim, scoped to whichever rule they're attached to — exactly as documented, and confirmed here with a real non-standard directive rather than just the common `allow`/`disallow` fields.

### `generateSitemaps`, verified with a real uneven split

`products/sitemap.ts` chunks a 5-item product list into groups of 2, so `generateSitemaps()` returns three ids (`0`, `1`, `2`) — the last chunk necessarily holding only one item. Verified real output: `.../sitemap/0.xml` contains products 1 and 2; `.../sitemap/2.xml` (the last, uneven chunk) contains only product 5. The URL convention the docs describe — `/.../sitemap/[id].xml` — matched exactly, and `npm run build`'s route table classified each of the three chunks as `●` (SSG, the `generateStaticParams`-style prerendered classification), since every id is known ahead of time from `generateSitemaps()` itself.

### The `id` parameter is a real string, not a number — confirmed against the docs' own example

The docs' version history table notes: as of v16.0.0, `id` is a promise resolving to a `string` (previously a plain number). Their own code sample, though, still writes `const start = id * 50000` as if doing numeric arithmetic directly on it. Verified directly in this demo: logging `typeof resolvedId` for every generated chunk printed `typeof=string` every time (`id="0" typeof=string`, `id="1" typeof=string`, `id="2" typeof=string`). The arithmetic still works — JavaScript's `*` operator coerces a numeric string automatically — but writing `Number(resolvedId) * CHUNK_SIZE` explicitly (as this demo does) is the honest version of what's actually happening, rather than relying on implicit coercion the way the docs' own example does.

### `new Date()` silently makes a sitemap dynamic — a real classification flip, tested both ways

This is the finding worth internalizing precisely, because it isn't mentioned anywhere in the sitemap docs and directly contradicts the "cached by default" framing they do give. `app/sitemap.ts` initially used `lastModified: new Date()` — the exact pattern shown in the official docs' own example. `npm run build`'s route table classified `/sitemap.xml` as `ƒ` (fully dynamic), not `○` (static). Swapping `new Date()` for a literal deterministic string (`'2026-01-01'`) and rebuilding flipped the classification back to `○` — confirming the cause directly rather than assuming it.

The reasoning: Cache Components treats `new Date()` the same category of "non-deterministic call" as `Math.random()` (Phase 3) — calling it at render/request time produces a different result each time, so Next.js can't safely treat the output as cacheable, and defers the whole route to request time. This was confirmed a second way: two real `curl` requests to `/sitemap.xml`, one second apart, returned genuinely different `<lastmod>` timestamps — proof the route actually re-executes per request, not just that the build-time classification symbol happened to say `ƒ`.

Separately, `robots.txt` was tested with an intentionally added `headers()` call (a genuine Request-time API, per the docs' "cached by default unless it uses a Request-time API" framing) — this, as expected, also flipped its classification from `○` to `ƒ`, then back to `○` once removed. So there are now two independently verified ways to force one of these special routes dynamic: an explicit Request-time API (`headers()`, `cookies()`), or an implicit non-deterministic call like `new Date()` — the second is far easier to trip over by accident, since it's the pattern the docs themselves demonstrate.

## Gotchas

- **`lastModified: new Date()` — the docs' own idiomatic example — silently makes the entire sitemap route dynamic under Cache Components**, verified with a real build classification flip in both directions. If a static sitemap is the goal, use a deterministic value (a stored/computed timestamp, not a fresh `new Date()` call at render time).
- **`robots.ts`/`sitemap.ts` follow ordinary Route Handler caching rules, not the Metadata-API-specific errors Topics 1–3 covered** — there's no special "runtime data in generateMetadata()"-style error here; a Request-time API just quietly flips the route's classification to dynamic, the same way it would for any other `route.ts`.
- **`generateSitemaps`'s `id` is a string as of Next.js 16**, even though the official example code performs arithmetic on it as if it were a number — relying on implicit numeric coercion works but isn't the type-honest way to write it.
- **Both `robots.txt` and `sitemap.xml` only mean anything to crawlers at the site root** — nesting is supported for `sitemap.ts` (explicitly, for splitting large sitemaps across route segments) but not for `robots.ts`, which the docs describe as living only in `app/`'s root.

## Interview Questions

**Q (High): The docs' own `sitemap.ts` example uses `lastModified: new Date()`. Under a Cache-Components-enabled project, does that keep the sitemap static?**

Answer: No — verified directly. `new Date()` called at render time is a non-deterministic call, the same category Cache Components treats `Math.random()` as (Phase 3), and it forces the whole route to classify as dynamic (`ƒ`) rather than static (`○`). This was confirmed two ways: the build's route table symbol flipped between runs with/without `new Date()`, and two real requests one second apart returned genuinely different `<lastmod>` values, proving the route actually re-executes rather than serving a cached static file.

The trap: assuming a docs example is automatically the "safe," production-ready pattern — the docs' sitemap page never mentions this tradeoff, since it predates (or simply doesn't address) Cache Components' stricter non-determinism rules.

**Q (Medium): `sitemap.ts` and `robots.ts` are described as "special Route Handlers." What follows from that about how they interact with runtime APIs like `cookies()` or `headers()`?**

Answer: They follow the same rules ordinary Route Handlers do (Phase 6) — reading a Request-time API forces that specific route to be rendered dynamically per request, rather than cached/prerendered. Verified directly: adding a `headers()` call to `robots.ts` flipped its build classification from `○` to `ƒ`; removing it flipped it back. This is a different mechanism from the dedicated "runtime data in generateMetadata()" build error Topic 2 covered — there's no special diagnostic here, just the ordinary Route Handler dynamic/static classification quietly changing.

The trap: assuming every Metadata-API-adjacent file behaves like `generateMetadata` (hard errors under Cache Components) — `robots.ts`/`sitemap.ts` behave like plain Route Handlers instead, with a silent classification change, not an error.

**Q (Medium): Why does `generateSitemaps` exist, given a single `sitemap.ts` can already return an array of URLs?**

Answer: Search engines cap how many URLs a single sitemap file should hold (the docs cite Google's 50,000-URL guidance) — a site with more URLs than that needs to be split across multiple sitemap files. `generateSitemaps()` returns the list of chunk ids up front (analogous to `generateStaticParams` for ordinary dynamic routes), and the paired `sitemap()` function receives one id at a time to compute just that chunk's slice of data. Verified directly: a 5-item product list split into chunks of 2 produced exactly three sitemap files at the documented `.../sitemap/[id].xml` URL convention, with the final chunk correctly holding just the one leftover item.

The trap: reaching for `generateSitemaps` for a small site "to be safe" — for anything under the per-file URL cap, a single `sitemap.ts` returning a plain array is simpler and sufficient; the split mechanism exists specifically for scale.

**Q (Low): The docs' `generateSitemaps` example computes `const start = id * 50000` directly. Given `id` is documented as a `Promise<string>` since v16, why does this not throw or silently break?**

Answer: JavaScript's `*` operator coerces operands to numbers automatically, so a numeric string like `"1"` behaves as `1` in that expression. It happens to work, but it's relying on implicit coercion rather than being explicit about the type. Verified directly in this demo: logging `typeof resolvedId` after awaiting `id` printed `string` for every generated chunk, confirming the documented v16 type change is real and observable, not just a type-signature-only change.

The trap: copying the docs' arithmetic verbatim without noticing it depends on implicit coercion — it happens to be harmless here, but it's the kind of pattern that breaks the moment someone "fixes" the code to be stricter (e.g., under a linter that flags implicit coercion) without understanding why it was written that way.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why `new Date()` inside `sitemap.ts` forces the route dynamic under Cache Components, and name the mechanism it shares with `Math.random()`
- [ ] Can explain why `robots.ts`/`sitemap.ts` don't produce the same kind of build error `generateMetadata` does when they read runtime data
- [ ] Can state what `generateSitemaps()` is for and describe the resulting URL convention
- [ ] Knows `generateSitemaps`'s `id` is a string as of Next.js 16, not a number
- [ ] Can explain why `robots.ts` only lives at the app root, while `sitemap.ts` supports nesting

---
*Next: Open Graph / Twitter images with `next/og` (`ImageResponse`) — the last major file-based metadata
convention, generating actual images instead of text/XML.*
