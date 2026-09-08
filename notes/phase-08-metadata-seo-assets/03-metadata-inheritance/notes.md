# Metadata Inheritance & Overriding Across Layouts

**Demo:** `app/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/` — a three-level chain
(root topic layout → `section/layout.tsx` → pages at various depths), each isolating one inheritance
question: same-segment vs. child-segment templating, whether templates stack across multiple levels,
whether a `title.default` itself gets templated, and the shared-constant technique for partial nested-field
inheritance. Every rendered `<title>` and `<meta>` below is real `curl` output against a running dev
server — two of this demo's own working predictions turned out wrong on first run and were corrected
after seeing the actual output, which is exactly the point of testing this rather than reasoning about it
from the docs' prose alone.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A child layout redefining `title: { template, default }` | Fully **replaces** the parent's `title` key for that branch | The parent's template no longer reaches descendants past this point |
| A page in the **same segment** as the layout defining `title.template` | That layout's template does **not** apply to it | Verified (Topic 1, reconfirmed here) — but the **next real ancestor's** template does apply instead |
| `title.default` used as a child's fallback title | Still gets **augmented by a template**, just not its own segment's | Verified: `section/no-title` rendered `Section \| Site`, not bare `Section` |
| Templates at two different ancestor levels (root's `%s \| Site`, section's `%s \| Section`) | **Do not stack** — only the closest applicable one wins | Verified: a genuine child of `section/` rendered `Deep Page \| Section`, never `\| Section \| Site` |
| A field like `openGraph` untouched by an intermediate layout | Passes through **that layout unaffected**, from whichever ancestor last set it | Verified: `section/`'s `openGraph` and `description` are identical to the root's, since `section/layout.tsx` never touches either |

## Where Does This Run?

Same as Topics 1–2 — entirely server-side, resolved before the response is finalized (or streamed alongside deferred content, for `generateMetadata`). This topic adds no new runtime behavior; it's about the *resolution algorithm* across more than one layout level, which Topics 1–2 only exercised at a single level of nesting.

## What Is This?

Every route in the App Router sits at the end of a chain of nested segments — root layout, any number of intermediate layouts, then the page. Next.js resolves that route's final metadata by walking the chain from the root down to the page, in order, and combining each segment's `metadata` export into a running result. Topics 1–2 already established the two rules that govern this — **shallow merge/replace** for ordinary keys, and **template scoping** for `title` specifically — but only demonstrated them one layout deep. This topic runs the same rules through a real three-level chain to see where intuition about "parent vs. child" breaks down.

> **Check yourself:** Before reading further — if a root layout sets `title.template: '%s | Site'` and a section layout beneath it sets its own `title.template: '%s | Section'` with no `title.default`... wait, `title.default` is required alongside a template (Topic 1). Restate: if the section layout sets both, does a genuinely-nested page three folders down ever end up with a title reflecting *both* templates?

## How It Works

### Redefining `title` at a lower layout fully replaces it for that branch

`section/layout.tsx` sets its own `title: { template: '%s | Section', default: 'Section' }`. Because `title` is a single key and metadata merging is shallow, this **completely replaces** whatever the root layout's `title` object was, for every segment under `section/`. Verified: `other-branch/page.tsx` (a sibling of `section/`, outside its subtree, defining no title) renders `<title>Site</title>` — the root's default, untouched. Nothing under `section/` can ever fall back to the root's `title.default` ("Site") again; `section/layout.tsx`'s own default ("Section") is the new fallback for that whole branch.

### The same-segment rule reaches past itself to the next real ancestor — verified against a wrong prediction

Topic 1 established that a `layout.tsx`'s `title.template` does not apply to a `title` set in the `page.tsx` of that *same* route segment. This demo initially assumed that meant such a title would render **completely untemplated**. It doesn't. `section/page.tsx` sets `title: 'Section Home'`, sitting beside `section/layout.tsx`'s `title.template: '%s | Section'`. The rendered result is:

```
<title>Section Home | Site</title>
```

Not `Section Home` (untemplated), and not `Section Home | Section` (the same-segment layout's own template). The root layout's template — two levels up — is the one that actually applies. The correct mental model: a layout's `title.template` is scoped to apply *one segment down from where it's defined*, never to its own segment. When resolving a title for a given segment, Next.js looks past that segment's own layout for the next real ancestor with a template, and applies that one instead of leaving the title bare.

### `title.default` is not exempt from templating either — a second wrong prediction, corrected

The same logic extends to `title.default` itself. `section/no-title/page.tsx` defines no `metadata` at all, so it falls back to `section/layout.tsx`'s `title.default` ("Section") — the closest ancestor that defines one. This demo initially assumed a bare default would render untemplated, same mistake as above. Verified actual output:

```
<title>Section | Site</title>
```

The docs are explicit about this if you read closely enough: `title` (string) and `title.default` "will augment `title.template` from the closest parent segment if it exists" — and per the same-segment rule, the "closest parent segment" relative to `section/layout.tsx`'s own default is the *root* layout, since `section/layout.tsx`'s own template doesn't apply to itself. Only `title.absolute` is genuinely exempt from every ancestor template (Topic 1).

### Templates don't stack across multiple levels

`section/deep/page.tsx` is a genuine child segment of `section/layout.tsx` (one real folder deeper, not the same segment). It sets `title: 'Deep Page'`. Verified output:

```
<title>Deep Page | Section</title>
```

Not `Deep Page | Section | Site` and not `Deep Page | Site`. Only the **closest** applicable template wins — `section/layout.tsx`'s own `%s | Section`, since `Deep Page` is a genuine child of that layout. The root's `%s | Site` template never gets a chance to apply here at all; it was already "used up" one level higher, when `section/layout.tsx`'s own default/title got templated by it.

### Fields untouched by an intermediate layout pass straight through

`section/layout.tsx` only ever touches `title`. It never mentions `description` or `openGraph`. Verified: both `section/no-title` and `section/deep` render the *exact* `description` and full `openGraph` (title, description, and image) that the root layout set — nothing from `section/layout.tsx` interferes, because merging happens **per key**, independently, across the whole chain. A segment redefining `title` has zero effect on how `openGraph` or `description` resolve for that same segment or its descendants; each field's resolution walks the ancestor chain on its own.

### Sharing one nested field while overriding others — the constant-extraction pattern

`section/shared-image/page.tsx` wants its own `openGraph.title`, but the same `openGraph.images` the root layout uses — and since `section/layout.tsx` doesn't touch `openGraph` at all, simply setting `openGraph: { title: '...' }` here would replace the whole object and silently drop the inherited image (the shallow-merge trap Topic 1 already covered). The fix, straight from the docs:

```tsx
// shared-og.ts
export const sharedOgImage = { images: ['/og/site.png'] }

// section/shared-image/page.tsx
export const metadata: Metadata = {
  title: 'Shared Image',
  openGraph: { ...sharedOgImage, title: 'Shared Image — Section' },
}
```

Verified: `og:image` renders as the identical `http://localhost:3000/og/site.png` the root layout produces, while `og:title` is this page's own `Shared Image — Section` — genuine partial sharing, achieved entirely with a plain JS constant, not a framework feature.

## Gotchas

- **A same-segment `layout.tsx`'s template being skipped doesn't mean "no template applies" — it means the *next* ancestor's template applies instead**, verified directly by `section/page.tsx` picking up the root's template rather than rendering untemplated.
- **`title.default` is not a special untemplated case** — it augments the closest applicable ancestor template exactly like an explicit string `title` would, verified by `section/no-title` rendering `Section | Site`, not bare `Section`.
- **Templates never stack across levels** — a genuinely nested page only ever picks up the *closest* enclosing template, never a concatenation of multiple ancestors' templates.
- **Redefining one metadata key (like `title`) at an intermediate layout has zero effect on any other key** (`description`, `openGraph`, etc.) — each field resolves independently down the chain, so "this layout set a title" does not mean "this layout is now the source of truth for everything."
- **Wanting to share just one nested field while overriding a sibling field requires a manual JS constant** — there's no built-in partial-merge option for objects like `openGraph`; Topic 1 already covered why (shallow merge), this topic just applies the documented workaround for real.

## Interview Questions

**Q (High): A `layout.tsx` at path `/section` sets `title.template: '%s | Section'`. The root layout above it sets `title.template: '%s | Site'`. A `page.tsx` sitting directly in `/section` (same folder as that layout) sets `title: 'Home'`. What does its `<title>` actually render as?**

Answer: `Home | Site` — verified directly. The same-segment rule means `/section`'s own layout's template does not apply to a title defined in its sibling `page.tsx`. But that doesn't mean no template applies at all: Next.js looks past that same-segment layout to the next real ancestor with a template, which is the root layout, and applies `%s | Site` instead.

The trap: assuming "the template in the same folder doesn't apply" is the end of the story and predicting an untemplated `Home` — this demo made that exact wrong prediction and had to correct it after seeing the real output.

**Q (High): Does `title.default` ever render without being wrapped by any template, the same way `title.absolute` does?**

Answer: No — only `title.absolute` is exempt from every ancestor's template. `title.default` (and a plain string `title`) still gets augmented by the closest applicable template — "closest" meaning the nearest ancestor layout whose template isn't scoped to the same segment as the default itself. Verified: a page with no title at all, falling back to a layout's `title.default: 'Section'`, rendered as `Section | Site` (the *root's* template), not bare `Section`.

The trap: conflating "this is a fallback value" with "this is exempt from templating" — those are unrelated properties of `title.default`, and only `title.absolute` actually grants exemption.

**Q (Medium): Two ancestor layouts each define a `title.template` — one at the root, one closer to the page. Does a deeply nested page's title ever end up wrapped by both?**

Answer: No. Only the single closest applicable template wins; templates never compose or stack across multiple ancestor levels. Verified: a page genuinely nested under a section layout with its own template rendered as `Deep Page | Section` — never `Deep Page | Section | Site` — even though the root layout's template was still active for everything outside that section's subtree.

The trap: assuming templates behave like CSS class composition (all applicable rules apply) rather than a single closest-wins resolution, the same way `title.template` itself only ever reads from one layer.

**Q (Medium): A layout redefines `title` but not `openGraph`. Does that affect how a child page's `openGraph` resolves?**

Answer: No — metadata fields resolve independently, key by key, down the ancestor chain. A layout touching `title` has no bearing on `openGraph`, `description`, or any other field; those keep resolving from whichever ancestor last set them, regardless of what else changed in between. Verified: pages under a `title`-redefining intermediate layout still rendered the exact `openGraph`/`description` values set at the root, untouched.

The trap: assuming "this layout owns the page's metadata now" as an all-or-nothing handoff — inheritance is per-field, not per-segment.

**Q (Low): How do you let a child segment share just one nested field (like `openGraph.images`) from a parent while overriding a sibling field (like `openGraph.title`), given metadata merging is shallow?**

Answer: There's no built-in partial merge for nested objects. The documented pattern is to factor the shared piece into a plain JS constant (e.g., `{ images: [...] }`) and spread it into each segment's own `openGraph` object alongside whatever that segment overrides. Verified directly: a page spreading the same `sharedOgImage` constant the root layout used rendered the identical `og:image` URL, while defining its own distinct `og:title`.

The trap: trying to solve this with a metadata-API feature (some kind of "inherit this key only" flag) that doesn't exist — the fix lives entirely in ordinary JavaScript composition, not in the Metadata API itself.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain, precisely, which ancestor's template applies to a title in the same segment as a layout that defines one — and that it's not "no template"
- [ ] Can state that `title.default` gets templated just like an explicit string title, and that only `title.absolute` is exempt
- [ ] Can explain why templates from two different ancestor levels never stack, with a concrete example
- [ ] Can explain why redefining `title` at one layout has no effect on how `openGraph`/`description` resolve
- [ ] Can write the shared-constant pattern for partially sharing a nested metadata field across segments

---
*Next: `sitemap.ts` & `robots.ts` generation — moving from `<head>` tags to the file-based conventions
that produce `sitemap.xml`/`robots.txt`, and how they interact with everything Topics 1–3 covered.*
