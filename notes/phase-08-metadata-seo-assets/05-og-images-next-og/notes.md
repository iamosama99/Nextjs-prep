# Open Graph / Twitter Images with `next/og` (`ImageResponse`)

**Demo:** `app/playground/phase-08-metadata-seo-assets/05-og-images-next-og/` — a static
`opengraph-image.tsx` and `twitter-image.tsx` colocated as siblings of `page.tsx`, plus a
`[slug]/opengraph-image.tsx` that reads dynamic route params with no `generateImageMetadata`/static
listing. Verified with real `curl` output: the actual generated `<meta>` tags, the real PNG bytes
(content-type, dimensions, file size) for both the static and dynamic images, and each route's real
static/dynamic classification from `npm run build`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `opengraph-image.tsx` / `twitter-image.tsx` colocated with a `page.tsx` | A special Route Handler that returns an actual image, auto-wired into that segment's `<head>` tags | No manual `og:image` meta tag needed — Next.js generates it and points to the image route |
| `new ImageResponse(jsxElement, options)` from `next/og` | JSX + CSS rendered to a real PNG at request or build time | Uses Satori + resvg under the hood — verified output is a genuine `1200x630` PNG, not a placeholder |
| `export const alt` / `size` / `contentType` | Config exports controlling the accompanying `og:image:*` meta tags | Verified: `size` alone produced `og:image:width`/`height` tags matching the `ImageResponse` dimensions exactly |
| A dynamic segment's `opengraph-image.tsx` reading `params` with no `generateImageMetadata` | Classifies as fully dynamic (`ƒ`), not a build error | Unlike `generateMetadata` (Topic 2), an image route reading unlisted `params` just quietly renders per-request — no Cache Components error |
| The `og:image` URL Next.js emits | Carries an appended query hash (e.g. `?dfb773fc07275659`) | Verified directly — a cache-busting fingerprint, not something you construct yourself |

## Where Does This Run?

Server-only, and — like `sitemap.ts`/`robots.ts` (Topic 4) — as a **special Route Handler**, not as part of page rendering. The docs are explicit about this: `opengraph-image.js`/`twitter-image.js` are "cached by default unless it uses a Request-time API or dynamic config option," the same framing Topic 4 verified for sitemaps. `ImageResponse` itself does its rendering work — turning JSX/CSS into pixels via Satori and resvg — entirely server-side; there's no client-side equivalent, and the output is a genuine binary `Response`, not markup.

## What Is This?

`opengraph-image`/`twitter-image` are file conventions: place a file with that name (image file or `.tsx`/`.ts`/`.js`) in any route segment, and Next.js automatically generates the corresponding `<meta property="og:image">` / `<meta name="twitter:image">` tags for that segment, pointing at a real, separately-servable image URL. The code-based version uses `ImageResponse` from `next/og`:

```tsx
import { ImageResponse } from 'next/og'

export const alt = 'About Acme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ fontSize: 128, display: 'flex', /* ... */ }}>About Acme</div>,
    { ...size }
  )
}
```

`ImageResponse` accepts a single JSX tree (using a constrained CSS subset — flexbox and absolute positioning, no grid) and renders it to an actual PNG, returned as a real `Response`. This demo verified the output is genuinely a PNG: fetching the generated image directly and inspecting it (`file` on the downloaded bytes) confirmed `PNG image data, 1200 x 630, 8-bit/color RGBA`.

> **Check yourself:** If both `opengraph-image.tsx` and `twitter-image.tsx` exist in the same segment, do they have to render the same image, or can they be completely independent?

## Why Does It Exist?

A social share preview card is one of the highest-leverage, most commonly-forgotten pieces of a site's SEO/sharing story — and hand-designing a static image for every blog post, product, or user profile doesn't scale. `ImageResponse` exists to make the "personalized card per URL" pattern (a post's title rendered onto a branded background, a product's photo with its price overlaid) as easy to write as any other server-rendered UI — JSX and CSS, not a separate image-editing pipeline or a headless-browser screenshot service. Colocating it as a file convention (rather than a manually-wired Route Handler + manually-written meta tags) means the `<meta>` tags and the actual image can never drift out of sync — Next.js generates both from the same source.

## How It Works

### Two independent images can coexist in one segment

This demo's `05-og-images-next-og/` folder has both `opengraph-image.tsx` (dark background) and `twitter-image.tsx` (blue background) side by side, each with its own `alt`/`size`/`contentType`. Verified: the rendered page's `<head>` carries both sets of tags independently —

```html
<meta property="og:image" content=".../opengraph-image?dfb773fc07275659"/>
<meta property="og:image:alt" content="OG Images Demo"/>
<meta name="twitter:image" content=".../twitter-image?1f3b50a3b7550651"/>
<meta name="twitter:image:alt" content="OG Images Demo (Twitter)"/>
```

— two entirely separate image routes, two entirely separate generated PNGs, no requirement that they match. (This demo intentionally gave them different background colors to make that independence visible.) Note also the query-string hash Next.js appends to each URL — a fingerprint for cache-busting, generated automatically, not something a page author constructs.

### `size`/`contentType` config exports map straight to meta tag values

Verified directly: this demo's `size = { width: 1200, height: 630 }` export produced `og:image:width: 1200` / `og:image:height: 630` exactly, and the actual downloaded PNG's real pixel dimensions matched — `1200 x 630`, confirmed by inspecting the file. There's no separate place these numbers could drift apart: the same `size` object is spread directly into `ImageResponse`'s own `options` (`{ ...size }`), so the meta tags and the actual rendered image are structurally guaranteed to agree.

### A dynamic segment's image route doesn't get the `generateMetadata`-style hard error

This is the most interesting contrast with Topics 1–3. `[slug]/opengraph-image.tsx` reads `params` directly (`const { slug } = await params`) with no `generateImageMetadata` providing a known list of slugs — structurally the same "unguarded runtime data access" shape that produced a hard build failure for `generateMetadata` (Topic 2) and for an unguarded page body (Phase 3 Topic 8). Verified: `npm run build` completed with **no error at all**. The route table instead classified `[slug]/opengraph-image` as `ƒ` (fully dynamic) — same treatment Topic 4 verified for `sitemap.ts`/`robots.ts` reading a Request-time API. The reason is consistent with Topic 4's finding: these image routes are ordinary Route Handlers under the hood, following Phase 6's static/dynamic classification rules, not the Metadata-API-specific rules that make `generateMetadata` fail the build outright. Fetching the dynamic image directly confirmed it renders correctly per-request — a real PNG, with the requested slug (`hello-world`) baked into the image text, content-type `image/png`, no error.

### Static optimization, verified by the plain top-level image's classification

Meanwhile, the segment-level `opengraph-image.tsx`/`twitter-image.tsx` (no dynamic segment, no runtime API) both classified as `○` (fully static) — matching the docs' "statically optimized (generated at build time and cached) unless they use Request-time APIs or uncached data" claim exactly. Static generation here means the actual PNG bytes are produced once at build time and served as a cached asset, not regenerated per request — the same tradeoff Topic 4 explored for `sitemap.ts`, just landing on the static side by default here since nothing non-deterministic or request-dependent is involved.

## Gotchas

- **A dynamic segment's `opengraph-image.tsx` reading unguarded `params` does not produce a Cache-Components build error** the way an unguarded page body or `generateMetadata` does — it silently classifies as dynamic (`ƒ`) instead, verified directly. Don't assume every "runtime data without a guard" situation in this project's Cache-Components setup behaves identically; it depends on which mechanism (page render vs. Metadata-API resolution vs. plain Route Handler) is actually involved.
- **The 500KB bundle limit and TTF/OTF/WOFF-only font restriction are real constraints**, not soft suggestions — `ImageResponse`'s JSX, CSS, fonts, and any embedded images all count toward that cap; exceeding it is a genuine failure mode worth knowing about even though this demo's simple text-only images stayed well under it.
- **Only a CSS subset is supported** — flexbox and absolute positioning work; `display: grid` and most other modern layout CSS do not, since rendering goes through Satori, not a real browser engine.
- **`opengraph-image` and `twitter-image` are independent** — nothing requires them to render the same content, verified by this demo's own deliberately-mismatched pair (different background colors, different alt text).
- **Local assets read inside these files should be read once at module scope**, not per-request — the docs frame this as the general "predictable values" caching guidance (an asset on disk doesn't depend on request data, so there's no reason to re-read it on every invocation).

## Interview Questions

**Q (High): A `[slug]/opengraph-image.tsx` reads `params` directly with no static params list. Does this fail the build under Cache Components, the way an unguarded page body would?**

Answer: No — verified directly with a clean `npm run build`. The image route classifies as fully dynamic (`ƒ`) instead of erroring. This is because `opengraph-image`/`twitter-image` (like `sitemap.ts`/`robots.ts`, Topic 4) are special Route Handlers under the hood, subject to Phase 6's ordinary static/dynamic classification rules, not the Metadata-API-specific hard-error rules that govern `generateMetadata` and page component bodies. Fetching the dynamic image directly confirmed it renders correctly per request, with the slug's value genuinely reflected in the output image.

The trap: assuming every "unguarded runtime-data access under Cache Components" situation in this codebase produces the same build error — it depends specifically on which resolution mechanism is involved, and this demo verified two different outcomes for structurally similar code (a hard error for `generateMetadata`/page bodies, a silent dynamic classification here).

**Q (Medium): How do the `size` config export and the actual pixel dimensions of the generated PNG stay in sync?**

Answer: They're not independently specified — the same `size` object is spread directly into `ImageResponse`'s own options (`{ ...size }`), so whatever width/height produces the `og:image:width`/`height` meta tags is the exact same value passed to the image renderer itself. Verified directly: a `size` of `{ width: 1200, height: 630 }` produced meta tags reading `1200`/`630`, and the actual downloaded PNG's real dimensions (confirmed via file inspection) matched exactly.

The trap: assuming these are two separate declarations that could drift apart (e.g., writing a `size` export that doesn't match a hardcoded width/height inside the `ImageResponse` call) — the recommended pattern (reusing the same `size` constant in both places) makes that drift structurally impossible, but only if you actually reuse it rather than duplicating the numbers.

**Q (Medium): Why does the docs' "statically optimized by default" claim for generated OG images matter for a route with heavy per-image computation (e.g., fetching a large dataset to render a chart)?**

Answer: If the image route has no dynamic segment params, no Request-time API calls, and no uncached data fetching, Next.js generates the actual image bytes once at build time and serves them as a static asset from then on — the expensive rendering work happens once, not on every social-media-crawler request. Verified directly in this demo: the segment-level `opengraph-image.tsx`/`twitter-image.tsx` (no dynamic data) both classified as `○` in the build output, meaning their PNGs are pre-baked build artifacts, not regenerated per request.

The trap: assuming image generation is inherently expensive-per-request and reaching for external caching infrastructure, when the static case is already handled automatically as long as the route avoids runtime data — the tradeoff only shows up once genuine per-request personalization (like the `[slug]` case) is introduced.

**Q (Low): What CSS features does `ImageResponse` support, and why the restriction?**

Answer: A subset roughly centered on flexbox and absolute positioning — plus custom fonts, text wrapping, centering, and nested images — but not modern layout features like CSS Grid. The restriction exists because `ImageResponse` doesn't render through an actual browser engine; it goes through Satori (JSX/CSS → SVG) and then resvg (SVG → PNG), and Satori's CSS support is intentionally a constrained subset sufficient for card-style layouts, not a full browser rendering engine.

The trap: assuming any CSS that works in a normal React component will also work inside `ImageResponse`'s JSX tree — reaching for `display: grid` or other unsupported properties will silently fail to lay out as expected rather than throwing an obvious error.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why a dynamic segment's `opengraph-image.tsx` reading unguarded `params` doesn't produce the same build error `generateMetadata` does
- [ ] Can explain how the `size` config export and the actual generated image's dimensions stay guaranteed in sync
- [ ] Can state the bundle size limit and supported font formats for `ImageResponse`
- [ ] Can explain why `opengraph-image`/`twitter-image` are described as "statically optimized by default," and what would flip that
- [ ] Knows `opengraph-image` and `twitter-image` are fully independent — nothing forces them to match

---
*Next: `next/image` deep dive — moving from generated social-share images to Next.js's general-purpose
image optimization component, used throughout ordinary page content rather than just metadata.*
