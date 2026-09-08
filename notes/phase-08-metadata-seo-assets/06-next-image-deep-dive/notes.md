# `next/image` Deep Dive

**Demo:** `app/playground/phase-08-metadata-seo-assets/06-next-image-deep-dive/` — a statically-imported
local JPEG, a remote image via `remotePatterns`, a `fill`+`sizes` responsive layout, and a side-by-side
`preload` vs. the deprecated `priority` prop. Every rendered `<img>`/`<link>` tag below is real `curl`
output against a running dev server. This topic surfaced a genuine, training-data-relevant trap the
codebase's own `AGENTS.md` warns about directly: **`priority` was deprecated in Next.js 16** in favor of
`preload`, and this demo verified it's not just renamed — the old prop no longer emits the behavior that
used to be its entire purpose.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `<Image src={staticallyImportedFile} alt="..." />` | `width`/`height`/`blurDataURL` all inferred automatically | Verified: no explicit sizing needed, and the blur placeholder is a real embedded low-res copy of the actual image |
| `<Image src="https://..." width={} height={} />` | Requires the host in `next.config.ts`'s `images.remotePatterns` | Verified: build succeeds only once the exact host is allow-listed; the rendered `src` routes through `/_next/image?url=...`, not the raw remote URL |
| `sizes` prop present vs. absent | Controls whether Next.js generates a **full responsive `srcset`** or a minimal **1x/2x** one | Verified directly: identical remote image, 2-entry `srcset` without `sizes`, 9-entry `srcset` with it |
| `priority` (pre-16 idiom) | **Deprecated as of Next.js 16** — TypeScript still accepts it, but it no longer emits the `<link rel="preload">` its whole purpose was | Verified: side-by-side render, only the `preload`-prop image got a real preload `<link>` in `<head>` |
| `preload` (current) | The prop that actually inserts `<link rel="preload" as="image">` | This is the correct current API for hinting an LCP/above-the-fold image |

## Where Does This Run?

`next/image` renders on the server for the initial HTML (like any other component), but the image **optimization** itself — resizing, format conversion, quality adjustment — happens through a request to `/_next/image`, a built-in image optimization endpoint Next.js runs as part of the server. The `<Image>` component itself can be used in both Server and Client Components; it's the underlying optimizer that does the actual work, on demand, the first time a given size/format combination is requested (then cached).

## What Is This?

`<Image>` from `next/image` is a drop-in replacement for the HTML `<img>` element that adds four things the docs are explicit about: automatic size optimization (correctly-sized images per device, modern formats like WebP), automatic layout-shift prevention (reserved space via `width`/`height` or `fill`), lazy loading by default, and support for resizing remote images on demand.

```tsx
import Image from 'next/image'

export default function Page() {
  return <Image src="/profile.png" alt="Picture of the author" width={500} height={500} />
}
```

`width`/`height` here describe the image's **intrinsic** aspect ratio, not its rendered size — actual display size is still controlled by CSS. Both are required unless the image is either statically imported or uses the `fill` prop.

> **Check yourself:** Why does a *statically imported* local image not need explicit `width`/`height`, while a *remote* image (given as a URL string) always does?

## Why Does It Exist?

Plain `<img>` tags leave three real performance problems entirely on the developer: shipping an image at its full original resolution regardless of how large it's actually displayed, causing layout shift while the browser doesn't yet know the image's dimensions, and loading every image immediately regardless of whether it's ever scrolled into view. `next/image` bakes in the fix for all three as defaults — correctly-sized/formatted images, reserved layout space, and lazy loading — while still allowing an escape hatch (`unoptimized`, a custom `loader`) for cases that don't fit the built-in optimizer.

## How It Works

### Static import: everything inferred, verified end to end

`local-static-import/page.tsx` imports a real local JPEG (`import photo from '../local-photo.jpg'`) and passes only `src`/`alt`/`placeholder="blur"` — no `width`, `height`, or `blurDataURL`. Verified rendered output:

```html
<img width="800" height="600" ... style="...background-image:url(&quot;data:image/svg+xml...%3Cimage ... href=&#x27;data:image/jpeg;base64,/9j/4AAQ...&#x27;/%3E...&quot;)" srcSet="/_next/image?url=...w=828...1x, ...w=1920...2x" src="/_next/image?url=...w=1920...q=75"/>
```

`width="800" height="600"` — the real dimensions of the source JPEG, inferred entirely from the import, no manual measurement needed. The blur placeholder isn't a separate tiny file: it's an inline SVG with a Gaussian blur filter wrapping a base64-encoded copy of the actual image data, set as a CSS `background-image` — visible instantly while the optimized version loads.

### Remote images: verified to require exact host allow-listing

`remote/page.tsx` uses `src="https://fastly.picsum.photos/id/162/800/600.jpg"` with explicit `width={800} height={600}` (required — Next.js can't read a remote file's real dimensions during the build). This demo added the host to `next.config.ts`:

```ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: 'fastly.picsum.photos', port: '', pathname: '/**' }],
}
```

Verified: the build succeeds and the rendered `src` is `/_next/image?url=https%3A%2F%2Ffastly.picsum.photos%2F...&w=1920&q=75` — the browser never requests the raw remote URL directly; every request routes through Next's own optimizer, which is exactly what makes the `remotePatterns` allow-list meaningful as a security boundary (an unlisted host would be refused before the app even attempts to fetch/proxy it).

### `sizes` controls which `srcset` strategy Next.js uses — verified with the exact counts the docs describe

The docs state: without `sizes`, Next.js generates a limited `srcset` (1x/2x); with `sizes`, a full responsive `srcset` (multiple explicit widths). Verified directly, same remote image, two different pages:

- **No `sizes`** (`remote/page.tsx`): `srcSet="...w=828...1x, ...w=1920...2x"` — exactly two entries.
- **With `sizes="(max-width: 768px) 100vw, 50vw"`** (`fill-sizes/page.tsx`): `srcSet="...w=384...384w, ...w=640...640w, ...w=750...750w, ...w=828...828w, ...w=1080...1080w, ...w=1200...1200w, ...w=1920...1920w, ...w=2048...2048w, ...w=3840...3840w"` — nine explicit width entries, plus the `sizes` attribute itself passed straight through to the `<img>` tag.

The `fill`-based image also carries `data-nimg="fill"` and inline styles (`position:absolute;height:100%;width:100%;...;object-fit:cover`) rather than `width`/`height` attributes — confirming `fill` stretches to the parent (which this demo gave `position: relative` and a fixed height, per the docs' requirement).

### `priority` is genuinely deprecated — not just renamed, verified by what it no longer does

This is the finding worth being precise about, since it's exactly the kind of pre-16 idiom `AGENTS.md` warns training data will get wrong. `preload-priority/page.tsx` renders the identical local image twice — once with `preload`, once with the older `priority` — and compares the real output:

```html
<!-- preload={true} -->
<link rel="preload" as="image" imageSrcSet="...w=828...1x, ...w=1920...2x"/>
<img ... /> <!-- no loading attribute -->

<!-- priority={true} -->
<img ... /> <!-- no loading attribute, but NO corresponding <link rel="preload"> anywhere -->
```

Both props suppress the default `loading="lazy"` attribute identically (compare against the plain `remote`/`local-static-import` images earlier, which both carry `loading="lazy"`) — so `priority` isn't a complete no-op. But the actual `<link rel="preload">` injection into `<head>` — the mechanism that lets the browser start fetching an LCP image before it's discovered in the body — only happened for the image using `preload`. The `priority`-using image got none. Also checked and worth reporting honestly: no deprecation warning appeared in the dev server's terminal output for either prop; TypeScript still accepts `priority` without complaint (it's a soft, docs-level deprecation, not a removed or type-error-producing one).

## Gotchas

- **`priority` no longer produces the `<link rel="preload">` it used to** — verified by direct comparison against `preload` on the identical image. Treating them as interchangeable pre-16 knowledge silently loses the actual LCP-preload behavior, even though the prop still compiles and still suppresses lazy loading.
- **A remote image's host must be in `images.remotePatterns` *exactly*** — `fastly.picsum.photos` and `picsum.photos` are different hosts for this purpose (the latter 302-redirects to the former in this demo's own test), and only the host actually named in `src` needs to be listed for that particular image to work.
- **`sizes` isn't just documentation of intent — it changes what Next.js actually generates.** Omitting it on a `fill`/CSS-responsive image doesn't just risk the browser guessing wrong; it caps the `srcset` to a 1x/2x pair, which can't adapt to as many real viewport widths as the full responsive set `sizes` unlocks.
- **`width`/`height` describe intrinsic aspect ratio, not display size** — CSS still controls how large the image actually renders; these props exist purely to reserve layout space and avoid shift.
- **A statically-imported image's automatic `blurDataURL` doesn't apply to animated images** (per the docs) — worth remembering before assuming `placeholder="blur"` works for every local asset unconditionally.

## Interview Questions

**Q (High): A colleague adds `priority` to a hero image, citing "that's how you mark the LCP image in Next.js." Is this still correct in a Next.js 16 project?**

Answer: Not fully — `priority` is deprecated as of Next.js 16 in favor of `preload`. Verified directly: rendering the same image with `priority` versus `preload` showed only the `preload` version actually gets the `<link rel="preload" as="image">` tag injected into `<head>` — the mechanism that lets the browser start fetching the image before it's discovered later in the body, which is the entire point of marking an LCP image. `priority` still compiles (TypeScript doesn't error) and still suppresses the default `loading="lazy"`, but it no longer produces the preload hint itself.

The trap: assuming a prop that still compiles without error and "does something" (suppresses lazy loading) is functionally equivalent to what it replaced — verified testing showed it's missing the specific behavior that made it useful for LCP optimization in the first place.

**Q (High): Why does a statically imported local image not need explicit `width`/`height`, while a remote image passed as a URL string always does?**

Answer: A statically imported image (`import photo from './photo.jpg'`) is a real file Next.js's build tooling can read directly during the build — it inspects the actual file and extracts its intrinsic width, height, and (for supported formats) a blur placeholder automatically. A remote URL string has no such build-time access — Next.js has no way to know a remote server's image dimensions without fetching it, so `width`/`height` must be supplied explicitly (or `fill` used instead) so the browser can still reserve the correct layout space before the image loads.

The trap: assuming `next/image` "figures out" every image's dimensions automatically regardless of source — only the statically-imported path gets that; the moment a `src` is a string (remote or even a public-folder path referenced by string rather than `import`), width/height become mandatory.

**Q (Medium): What's the concrete difference in generated `srcset` between a `fill` image with `sizes` and one without, and why does it matter?**

Answer: Without `sizes`, Next.js generates a minimal `srcset` covering roughly 1x/2x pixel-density variants — suitable when the image renders at a genuinely fixed size. With `sizes`, it generates a much larger set of explicit width variants (verified directly: two entries without `sizes` vs. nine with it, on the identical source image), because `sizes` tells the browser how much of the viewport the image actually occupies at different breakpoints, letting it pick intelligently from a wider range of candidates. Omitting `sizes` on a genuinely responsive layout risks the browser defaulting its assumption to "as wide as the viewport" and downloading a needlessly large image.

The trap: treating `sizes` as purely descriptive/optional metadata — it materially changes what candidate image widths even exist to choose from, not just which one gets picked.

**Q (Medium): Why does `next/image` route every remote image request through `/_next/image?url=...` instead of pointing `src` at the original remote URL?**

Answer: Two reasons, both verified in this demo's rendered output: it lets Next.js actually perform the optimization (resizing, format conversion, quality adjustment) server-side before the browser ever requests the image, and it's the enforcement point for `remotePatterns` — an image from a host not explicitly allow-listed in `next.config.ts` is refused, which only works because every remote image request is forced through Next's own endpoint rather than hitting the third-party host directly from the browser.

The trap: assuming `remotePatterns` is just a config-time lint/warning — it's an actual runtime gate the optimizer enforces on every request, which is only possible because of this proxying behavior.

**Q (Low): Does a component using `priority`/`preload` still get `loading="lazy"` by default?**

Answer: No — verified directly, both props suppress the default `loading="lazy"` attribute identically (neither rendered `<img>` carried a `loading` attribute at all, unlike ordinary images elsewhere in this demo which both showed `loading="lazy"`). This makes sense given both props exist to mark an image as high-priority/above-the-fold — lazy-loading something explicitly flagged as needing to load immediately would defeat the purpose.

The trap: assuming `priority`'s deprecation means it does literally nothing now — it still affects lazy-loading behavior; what it specifically lost is the `<link rel="preload">` injection.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state that `priority` is deprecated in favor of `preload` in Next.js 16, and precisely what behavior the old prop lost (not just "it's renamed")
- [ ] Can explain why static imports don't need explicit `width`/`height` but remote URLs do
- [ ] Can describe the concrete `srcset` difference `sizes` makes, with real numbers
- [ ] Can explain why remote images route through `/_next/image?url=...` rather than the raw remote URL
- [ ] Knows `width`/`height` control aspect ratio/layout reservation, not actual rendered size

---
*Next: `next/font` — self-hosting fonts and preventing layout shift, the other half of Next.js's built-in
Core Web Vitals story alongside `next/image`.*
