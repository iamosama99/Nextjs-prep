# `next/font` — Self-Hosting & Layout Shift Prevention

**Demo:** `app/playground/phase-08-metadata-seo-assets/07-next-font/` — a Google Font (`Inter`, via
`next/font/google`) and a real local `.woff2` file (`RobotoMono-Regular.woff2`, via `next/font/local`),
applied two different ways (`className` and a CSS variable). Verified with real `curl` output against
both a dev server and a production build: the actual generated `@font-face` CSS, the real font file bytes
served from this app's own origin, and one genuine surprise about what the `subsets` option actually
controls — confirmed directly against the docs' own (easy-to-miss) wording once the empirical result
didn't match a first assumption.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `Inter({ subsets: ['latin'] })` from `next/font/google` | Downloads the font at **build time**, self-hosts it as a static asset | Verified: zero references to `fonts.googleapis.com`/`fonts.gstatic.com` anywhere in the rendered page or its CSS |
| `localFont({ src: './my-font.woff2' })` from `next/font/local` | Self-hosts a font file you already have | Verified: the exact same `.woff2` bytes (byte-for-byte size match) served from `/_next/static/media/...` |
| `subsets: ['latin']` | Controls what gets **preloaded**, not what CSS is generated | Verified directly: the generated CSS still contained `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`, `vietnamese`, and `latin-ext` `@font-face` blocks alongside `latin`, despite only `latin` being requested |
| `font.className` vs. `font.variable` | Two different application strategies — direct class vs. a CSS custom property | Verified both work simultaneously in the same page, applied at different levels of the tree |
| `adjustFontFallback` (default `true`) | Auto-generates a metrics-matched fallback `@font-face` | Verified directly: a `<meta name="next-size-adjust">` tag and a `size-adjust`/`ascent-override`/`descent-override` fallback `@font-face` rule both appeared, unprompted |

## Where Does This Run?

Entirely at build time for the actual font-fetching/self-hosting work — `next/font/google` downloads the font files and CSS from Google once, during the build, and from then on serves them from the app's own domain like any other static asset. Rendering-wise, the font loader function is called in a Server Component (typically a layout), and the resulting `className`/`style`/`variable` are just plain values passed down like any other prop — no special runtime behavior on the client beyond what a normal `@font-face`-backed class name would need.

## What Is This?

`next/font` (via `next/font/google` or `next/font/local`) solves the classic web font problem set: a font hosted on a third party (Google Fonts) means an extra DNS lookup, connection, and request the browser can't start until it discovers the `<link>` tag — and worse, a mismatch between the fallback font's metrics and the real font's metrics causes visible text reflow ("layout shift") the instant the real font loads in. `next/font` addresses both by downloading and self-hosting the font files as part of the build (no third-party request at all, ever) and by automatically generating a metrics-adjusted fallback font-face so the fallback and the real font occupy the same space.

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

> **Check yourself:** If `next/font/google` downloads Google's font files at build time and self-hosts them, does the browser ever make a request to a Google-owned domain when a real visitor loads the page?

## Why Does It Exist?

Before `next/font`, using a Google Font meant a `<link href="https://fonts.googleapis.com/...">` in the document — a real third-party network dependency on every page load, and (pre-privacy-focused browsers notwithstanding) a request that reveals the visitor's IP to Google. It also meant no automatic answer to the layout-shift problem: a page renders with a fallback font, the real font finishes loading moments later with different letter widths/heights, and the visible text reflows — a real, measurable Core Web Vitals (CLS) hit. `next/font` folds both fixes into the font-loading step itself rather than leaving them as separate manual optimizations a developer has to remember.

## How It Works

### Self-hosting, verified with real bytes from this app's own origin

This demo's `fonts.ts` defines both an `Inter` Google Font and a local `RobotoMono-Regular.woff2` file:

```ts
export const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
export const robotoMono = localFont({
  src: './fonts/RobotoMono-Regular.woff2',
  display: 'swap',
  variable: '--font-roboto-mono',
  weight: '400',
  style: 'normal',
})
```

Verified two ways: first, grepping the entire rendered page (both dev and a real production build) for `fonts.googleapis` / `fonts.gstatic` found **zero genuine references** — the only matches were this demo's own descriptive text, not real network calls. Second, fetching the actual generated `@font-face` `src` URLs directly — `/_next/static/media/83afe278b6a6bb3c-....woff2` for Inter, `/_next/static/media/RobotoMono_Regular-....woff2` for the local font — both returned real, valid `font/woff2` files served from `localhost:3000` itself. The local font's downloaded size (`12680` bytes) matched the original source file exactly, confirming it's genuinely the same file being self-hosted, not substituted or re-fetched from elsewhere.

### `subsets` controls preloading, not what CSS gets generated — a real surprise, resolved against the docs' own wording

This is the finding worth sitting with, because the initial assumption here was wrong and the correction came from reading the docs more carefully after seeing unexpected output. `subsets: ['latin']` was requested for Inter, expecting the generated CSS to contain *only* Latin-script `@font-face` rules. The real generated CSS instead contained **seven** separate `@font-face` blocks for Inter, covering `cyrillic-ext`, `cyrillic`, `greek-ext`, `greek`, `vietnamese`, `latin-ext`, and finally `latin` — each with its own `unicode-range`:

```css
@font-face{font-family:Inter;...;src:url(.../2c55a0e60120577a-...woff2)format("woff2");unicode-range:U+460-52F,...} /* cyrillic-ext */
@font-face{font-family:Inter;...;src:url(.../9c72aa0f40e4eef8-...woff2)format("woff2");unicode-range:U+400-45F,...} /* cyrillic */
/* ...greek-ext, greek, vietnamese, latin-ext... */
@font-face{font-family:Inter;...;src:url(.../83afe278b6a6bb3c-...woff2)format("woff2");unicode-range:U+??,U+131,...} /* latin */
```

The docs' "Specifying a subset" section resolves this precisely, in wording easy to skim past: *"You'll need to define which of these subsets you want to **preload**. Failing to specify any subsets while `preload` is `true` will result in a warning."* — `subsets` isn't a CSS-generation filter at all; it's specifically about **preloading**. Google's own CSS response for a multi-script font like Inter always includes every script's `@font-face` block, each scoped to its own `unicode-range` — and because `unicode-range` is a real browser feature, the browser only ever downloads the specific `.woff2` file whose range matches characters actually present on the page. Verified: fetching the Inter font file this page's own (Latin-only) text actually needs returned a real font — but the CSS containing the *other* six scripts' declarations doesn't mean those files get downloaded for a Latin-only page; it means they're declared but never matched, hence never fetched by the browser.

### `className` vs. the CSS variable method — verified working simultaneously, side by side

This demo deliberately applies the two fonts two different ways in the same render tree: `inter.className` directly on a `<p>` tag, and `robotoMono`'s `variable` (`--font-roboto-mono`) exposed on the layout's wrapper `<div>` and consumed via `style={{ fontFamily: 'var(--font-roboto-mono)' }}` on a different, unrelated `<p>`. Verified: the wrapper `<div>`'s real rendered `class` attribute included both `..._variable` suffixed classes (`inter_....__variable`, `robotomono_....__variable` — Next's CSS-module-scoped variable class names), and both text blocks rendered in their respective fonts. The `variable` approach is the one that composes with something like Tailwind's font-family theme config (relevant once Phase 9 introduces Tailwind) — declare the variable once high in the tree, reference it by name anywhere beneath it, rather than needing the font loader's own `className` threaded through every component that needs it.

### `adjustFontFallback`'s metrics-matching, confirmed unprompted

Neither font's config explicitly touched `adjustFontFallback` (default `true` for Google Fonts). Verified anyway: the rendered `<head>` carried a `<meta name="next-size-adjust" content=""/>` tag, and the generated CSS included dedicated fallback `@font-face` rules — `Inter Fallback` and `robotoMono Fallback` — each pointing at a local system font (`local(Arial)`) with computed `ascent-override`/`descent-override`/`size-adjust` percentages tuned to match the real font's metrics. This is the actual layout-shift-prevention mechanism the docs describe: the browser paints text in the metrics-matched fallback immediately, then swaps to the real font once it loads, without the text reflowing, because the fallback was deliberately resized/adjusted to occupy the exact same space.

## Gotchas

- **`subsets` is about preloading, not about which font files exist in the CSS** — verified directly: requesting only `latin` still produced `@font-face` blocks for six other scripts. Relying on `subsets` to reduce the *total CSS size* misunderstands what it actually does; `unicode-range` (present regardless of `subsets`) is what keeps the browser from downloading scripts a page never uses.
- **Both `next/font/google` and `next/font/local` require calling the loader function from a file, then applying the returned `className`/`variable` — they don't work by importing a CSS file directly**, and the returned object's `className` must actually be threaded onto a real DOM element for anything to apply.
- **The path to a local font in `next/font/local`'s `src` is resolved relative to the file where `localFont` is called**, not the project root — a font file colocated in a `fonts/` subfolder next to the loader call, as this demo does, needs `./fonts/filename.woff2`, not an absolute or root-relative path.
- **A variable font generally doesn't need an explicit `weight`** (Inter here specifies none) — but a non-variable font, or `next/font/local` without a variable source, does need `weight` specified or the font may not render the intended boldness/style at all.
- **The metrics-matched fallback (`adjustFontFallback`) is automatic and unprompted** — don't assume a project needs to hand-tune `ascent-override`/`size-adjust` values manually; verified this demo got a real, computed fallback rule without any explicit configuration for it.

## Interview Questions

**Q (High): A teammate requests `subsets: ['latin']` on a Google Font expecting the generated CSS to only contain Latin-script font files, to reduce page weight. Is this the right mental model?**

Answer: No — verified directly. `subsets` controls which subset gets **preloaded** (the docs' own wording), not what appears in the generated CSS at all. Requesting only `latin` still produced separate `@font-face` blocks for `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`, `vietnamese`, and `latin-ext` in this demo's real output — Google's CSS response for a multi-script font always includes every script, each scoped with its own `unicode-range`. What actually limits real network transfer is `unicode-range` itself: the browser only fetches the specific `.woff2` file whose range matches characters genuinely present on the rendered page, regardless of what `subsets` was set to.

The trap: treating `subsets` as a bundle-size lever — it's a preload-priority lever; the real "only download what's used" behavior comes from the browser's own `unicode-range` matching, which happens with or without `subsets` being narrowed.

**Q (High): Does `next/font/google` ever cause the browser to make a network request to a Google-owned domain?**

Answer: No, not for a real visitor — verified directly by grepping the entire rendered page and its CSS for `fonts.googleapis.com`/`fonts.gstatic.com` and finding zero genuine references (only this demo's own descriptive text matched, not an actual network call). The font files and CSS are downloaded once at *build* time and then self-hosted as static assets under `/_next/static/media/`, confirmed by fetching the actual font URL directly and getting back a real `font/woff2` response from the app's own origin.

The trap: assuming "uses a Google Font" implies "makes a request to Google" the way a plain `<link href="fonts.googleapis.com/...">` would — `next/font`'s entire value proposition is eliminating exactly that request.

**Q (Medium): What's the practical difference between applying a font via `font.className` versus exposing it as a CSS variable via the `variable` option?**

Answer: `className` applies the font directly and immediately to whatever element receives it — simple, but that element (or a component threading the className down) needs direct access to the font object. The `variable` option instead declares a CSS custom property (e.g. `--font-roboto-mono`) on whatever element the `variable` class is applied to, which any descendant can then reference via `fontFamily: 'var(--font-roboto-mono)'` (or a CSS framework's theme config) without needing the font object itself. Verified directly: this demo applied `inter.variable` and `robotoMono.variable` together on one layout-level wrapper `div`, then consumed them completely differently two levels down — one via direct `className`, one via the CSS variable — both working simultaneously.

The trap: assuming these are two names for the same mechanism — `className` is direct application, `variable` is indirection through CSS, and the choice matters once composing with a system (like Tailwind's `fontFamily` theme keys) that expects a CSS variable rather than a font loader's own class name.

**Q (Medium): What does `adjustFontFallback` actually do, and how would you confirm it's working without a visual layout-shift test?**

Answer: It generates a second `@font-face` rule for a locally-available fallback font (e.g. `local(Arial)`), with `ascent-override`/`descent-override`/`size-adjust` percentages computed to match the real font's metrics as closely as possible — so the fallback occupies the same vertical space the real font will, preventing the reflow that would otherwise happen when the real font finishes loading. It can be confirmed without a visual CLS test by inspecting the generated CSS directly: verified in this demo, both fonts produced a distinctly-named `Fallback` `@font-face` rule with real computed override percentages, plus a `<meta name="next-size-adjust">` tag in `<head>` — evidence the mechanism ran, without needing to visually observe a page that would otherwise reflow.

The trap: assuming layout-shift prevention requires the actual custom font to finish loading before any text can be measured — the fix works specifically by adjusting the *fallback*, which is available immediately, not by speeding up the real font's arrival.

**Q (Low): Why does `next/font/local`'s `src` path resolve relative to the file calling `localFont`, rather than the project root?**

Answer: It's a deliberate colocation-friendly design — the docs explicitly allow storing local font files anywhere in the project, including inside `app/`, precisely so a font can live next to the code that uses it rather than being forced into a single top-level assets folder. Resolving relative to the calling file is what makes that colocation actually convenient; an absolute/root-relative path would work too but would decouple the font file's location from where it's declared.

The trap: assuming every asset-referencing path in Next.js resolves the same way (e.g., relative to `public/`, the way an `<img src="/x.png">` string would) — `next/font/local`'s `src` is resolved differently, relative to the module file itself, which matters once a font is moved to a different folder without updating the loader call.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain precisely what `subsets` controls (preloading) versus what it does *not* control (which `@font-face` blocks exist in the generated CSS)
- [ ] Can explain why `next/font/google` never causes a request to a Google-owned domain for a real visitor
- [ ] Can explain the practical difference between `font.className` and `font.variable`, with a concrete scenario where you'd need the variable form
- [ ] Can explain what `adjustFontFallback` generates and how to verify it worked by inspecting CSS rather than doing a visual test
- [ ] Knows `next/font/local`'s `src` path resolves relative to the calling file, not the project root

---
*Next: Favicons & app icon conventions — the last topic in this phase, covering the remaining file-based
metadata conventions (`favicon.ico`, `icon`, `apple-icon`) that Topics 1–6 referenced but didn't cover
directly.*
