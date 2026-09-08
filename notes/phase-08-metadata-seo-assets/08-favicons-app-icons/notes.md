# Favicons & App Icon Conventions

**Demo:** `app/icon.tsx` and `app/apple-icon.tsx` at the project root, plus two nested cases under
`app/playground/phase-08-metadata-seo-assets/08-favicons-app-icons/`: a `custom-section/icon.tsx`
overriding the root icon for its own subtree, and a `multiple-icons/` segment using numbered
`icon1.tsx`/`icon2.tsx` files with no base `icon.tsx` at all. Every `<link>` tag and every fetched image
below is real output from a clean production build (`npm run build` + `npm run start`) — this project
had no `favicon.ico` or any icon convention in place before this topic, so every result here is a genuine
before/after rather than a pre-existing default being described.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `app/icon.tsx` (code-generated, root) | A special Route Handler producing `<link rel="icon" href="/icon?<hash>" .../>` | Verified: a real `32×32` PNG, confirmed by direct file inspection |
| `app/apple-icon.tsx` (root) | Produces `<link rel="apple-touch-icon" href="/apple-icon?<hash>" .../>` | Verified: a real `180×180` PNG — a different, larger canonical size than `icon` |
| A nested segment's own `icon.tsx` | **Overrides** the root icon for every page under that segment | Verified: `custom-section`'s pages link to their own `.../custom-section/icon`, not the root `/icon` |
| A nested segment defining `icon.tsx` but not `apple-icon.tsx` | The segment's icon overrides, but `apple-icon` still **inherits** from the root | Verified directly — per-icon-type inheritance is independent, same shallow-per-field pattern Topic 3 established for ordinary metadata |
| `icon1.tsx`, `icon2.tsx` (no base `icon.tsx`) | **Multiple** `rel="icon"` tags, one per file, sorted lexically | Verified: two separate `<link>` tags, `icon1` (16×16) before `icon2` (32×32) — and this works for code-generated icons too, not just image files, despite the docs only demonstrating it for the image-file case |

## Where Does This Run?

Same as Topic 5's OG images — these are special Route Handlers, not page-rendering. `favicon`/`icon`/`apple-icon` files (whether static image files or `.tsx` code) are evaluated server-side, and per the docs' own framing, follow the same "statically optimized by default, cached, unless a Request-time API or uncached data is involved" rule Topics 4–5 already verified for `sitemap.ts`/`robots.ts`/OG images.

## What Is This?

Three related file conventions, each producing a different `<link>` tag for a different consumer:

- **`favicon.ico`** — the classic browser-tab icon; `.ico` only, and only allowed at the literal root of `app/`.
- **`icon`** — a more flexible general-purpose icon; supports `.ico`/`.jpg`/`.jpeg`/`.png`/`.svg` as files, or `.js`/`.ts`/`.tsx` for code-generated icons via `ImageResponse`, and — unlike `favicon` — can live in **any** route segment, not just the root.
- **`apple-icon`** — the icon iOS uses for "Add to Home Screen"; same flexibility as `icon` minus SVG support (`.jpg`/`.jpeg`/`.png`, or code-generated).

```tsx
// app/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<div style={{ /* ... */ }}>N</div>, { ...size })
}
```

> **Check yourself:** If a nested route segment defines its own `icon.tsx` but no `apple-icon.tsx`, does a page in that segment use the segment's icon for `apple-touch-icon` too, or fall back to the root's `apple-icon`?

## Why Does It Exist?

Every platform that surfaces a link to a site — a browser tab, an OS taskbar, an iOS home screen shortcut, a search result — wants an icon, and each has slightly different size/format expectations (a browser favicon is tiny and simple; an iOS home-screen icon is much larger and typically needs a solid background since iOS applies its own corner-rounding/shadow). Rather than hand-writing every `<link rel="icon">`/`<link rel="apple-touch-icon">` variant with the right `sizes`/`type` attributes, the file convention lets Next.js infer all of that from whatever file (or generated image) is provided — the same "derive `<head>` tags from a real asset" philosophy Topic 5 covered for Open Graph images, applied to the icon-specific set of `<link>` tags instead.

## How It Works

### Root-level icons, verified end to end

`app/icon.tsx` (32×32, black background, "N") and `app/apple-icon.tsx` (180×180, indigo background, "N") sit at the project root. Verified on the root page's real rendered `<head>`:

```html
<link rel="icon" href="/icon?29eec99ea0e933c1" type="image/png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-icon?601129381b9beeae" type="image/png" sizes="180x180"/>
```

Fetching both URLs directly and inspecting the downloaded files confirmed genuine PNGs at exactly the declared dimensions — `32 x 32` and `180 x 180` respectively — matching the `size` config export in each file exactly, the same size/output guarantee Topic 5 verified for OG images.

### A segment's own icon overrides the root — verified by a genuinely different URL

`custom-section/icon.tsx` (32×32, yellow background, "S") sits in a nested playground folder. Verified on that segment's rendered `<head>`:

```html
<link rel="icon" href="/playground/phase-08-metadata-seo-assets/08-favicons-app-icons/custom-section/icon?0a4263f0aa5380a8" type="image/png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-icon?601129381b9beeae" type="image/png" sizes="180x180"/>
```

The `icon` link now points at the segment's **own** icon route (`.../custom-section/icon`), a completely different URL from the root's `/icon` — confirmed by downloading both and seeing genuinely different image content. But `apple-touch-icon` still points at the **root's** `/apple-icon`, unchanged — because this segment never defined its own `apple-icon.tsx`. This is the same shallow, per-field inheritance behavior Topic 3 established for ordinary `metadata` fields, just applied to icon conventions specifically: overriding one icon type has zero effect on how a *different* icon type resolves for that same segment.

### Multiple numbered icons work for code-generated files too — verified, despite docs only showing it for image files

The docs describe the numbered-suffix convention (`icon1.png`, `icon2.png`, sorted lexically) specifically under the "Image files" section, without repeating the claim under "Generate icons using code." This demo tested it directly with `.tsx` files instead of images: `multiple-icons/icon1.tsx` (16×16, red, "1") and `multiple-icons/icon2.tsx` (32×32, green, "2"), no base `icon.tsx` present. Verified rendered output:

```html
<link rel="icon" href=".../multiple-icons/icon1?84d85e6a79c9f55f" type="image/png" sizes="16x16"/>
<link rel="icon" href=".../multiple-icons/icon2?09bd5b2d17a79a5d" type="image/png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-icon?601129381b9beeae" type="image/png" sizes="180x180"/>
```

Two separate `rel="icon"` tags, `icon1` genuinely appearing before `icon2` — confirming the lexical-sort behavior extends to code-generated icons, not just literal image files as the docs' structure might suggest to a careful reader.

## Gotchas

- **`favicon` can only exist at the true root of `app/`** — for segment-specific icons, `icon` is the only option; there's no such thing as a nested `favicon.ico`.
- **Overriding one icon type in a segment doesn't affect other icon types** — verified directly: a segment with its own `icon.tsx` but no `apple-icon.tsx` still inherits `apple-touch-icon` from the root, exactly like Topic 3's per-field metadata inheritance.
- **You cannot generate a `favicon` with code** — the docs are explicit: `favicon` only supports the literal `.ico` file convention; a code-generated small icon needs the `icon` convention instead (which does support `.ico` as a static file too, or `.tsx`/`.ts`/`.js` for generation).
- **The numbered multi-icon convention isn't documented as image-file-only, but it isn't explicitly documented for code-generated icons either** — verified directly that it does work for `.tsx` files, which is worth confirming rather than assuming based on which doc section happens to mention it.
- **A code-generated `icon`/`apple-icon` is "statically optimized by default" like `sitemap.ts`/OG images (Topics 4–5)** — the same non-determinism and Request-time-API caveats from those topics apply here too, though this demo's icons are all fully static (no dynamic data involved).

## Interview Questions

**Q (High): A nested route segment defines its own `icon.tsx` but not its own `apple-icon.tsx`. What icon does a page in that segment use for each?**

Answer: The segment's own `icon.tsx` for the browser-tab/general icon (`rel="icon"`), but the **root's** `apple-icon.tsx` for the iOS home-screen icon (`rel="apple-touch-icon"`) — verified directly: a segment with only its own `icon.tsx` rendered a `rel="icon"` link pointing at its own icon route, while `rel="apple-touch-icon"` still pointed at the unrelated root `/apple-icon` URL, unchanged.

The trap: assuming "this segment has a custom icon" is a single, all-or-nothing override — like ordinary metadata (Topic 3), icon resolution is per-field (per icon *type*, here), and overriding one type has zero bearing on any other.

**Q (Medium): Why can't `favicon` be generated with code, unlike `icon` and `apple-icon`?**

Answer: The docs state this as a hard constraint — `favicon` only supports the literal `.ico` file convention; there's no code-generation path for it at all. `icon` exists specifically as the more flexible convention (supporting `.ico`/`.jpg`/`.jpeg`/`.png`/`.svg` as files, or `.js`/`.ts`/`.tsx` via `ImageResponse`) — for a segment or root that wants a *generated* favicon-equivalent, `icon` is the intended tool, not a workaround around `favicon`'s limitation.

The trap: trying to make `favicon.tsx` work and being confused when it's simply not a recognized file convention — the fix isn't a different file extension, it's a different convention (`icon`) entirely.

**Q (Medium): Does the numbered multi-icon convention (`icon1`, `icon2`, ...) only work for literal image files, or also for code-generated icon routes?**

Answer: It works for code-generated `.tsx`/`.ts`/`.js` icon files too — verified directly with two `ImageResponse`-based files (`icon1.tsx`, `icon2.tsx`, no base `icon.tsx`), producing two separate `rel="icon"` tags in the correct lexical order (`icon1` before `icon2`). The docs happen to introduce this convention under the "Image files" section specifically, which could easily be misread as file-only, but nothing about the mechanism (Next.js scanning for numbered variants of the base convention name) is inherently tied to whether the matched file is a static image or a code-generating route.

The trap: assuming a convention only documented in one section of the docs is exclusive to that section's file type — worth testing directly (as this demo did) rather than assuming a doc's structural placement implies a hard restriction.

**Q (Low): What's the practical reason `apple-icon`'s recommended size (180×180) is so much larger than `icon`'s typical 32×32?**

Answer: They serve different physical contexts. A browser tab favicon is rendered tiny (16–32px range) and needs to be legible at that scale; an iOS home-screen icon is displayed much larger (and historically needed to look good across multiple Retina-density home screen tiles), so Apple's own guidance calls for a substantially higher-resolution source image — 180×180 is Apple's standard recommended size for the highest-density modern devices. This demo's own `apple-icon.tsx` used exactly that size, and the fetched image confirmed the real output matched.

The trap: reusing the same small icon file/size for both `icon` and `apple-icon` "since they're both just app icons" — the intended use cases have genuinely different resolution requirements, which is exactly why they're two separate conventions rather than one icon serving both purposes.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why overriding a segment's `icon` doesn't affect its inherited `apple-icon`, and connect this to Topic 3's per-field inheritance model
- [ ] Can state why `favicon` has no code-generation path while `icon`/`apple-icon` do
- [ ] Can explain where `favicon` is allowed to live versus `icon`/`apple-icon`
- [ ] Knows the numbered multi-icon convention (`icon1`, `icon2`, ...) works for both image files and code-generated routes
- [ ] Can state the typical size difference between `icon` and `apple-icon` and why it exists

---

Phase 8 (Metadata, SEO & Assets) is now complete — 8/8 topics, covering static and dynamic metadata, multi-level
inheritance, `sitemap.ts`/`robots.ts`, generated OG/Twitter images, `next/image`, `next/font`, and this topic's
icon conventions. Together these form the App Router's complete `<head>`-and-assets story.
