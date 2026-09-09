# CSS Modules in Next.js

**Demo:** `app/playground/phase-09-styling/01-css-modules/` — a page and a colocated `BaseButton`
component, each with their own `.module.css` file defining a class **literally named `.primary`** in
both. Verified with real `curl` output against both a dev server and a clean production build
(`npm run build` + `npm run start`): the actual generated class names, the compiled production CSS
selectors, and the real CSS ordering in the built stylesheet.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A file named `*.module.css` | The trigger for CSS Modules — any other `.css` filename is treated as global CSS instead | Verified: two files both defining `.primary` produced two entirely different real class names, zero collision |
| `import styles from './x.module.css'; styles.primary` | A build-time-generated unique string, not the literal class name `primary` | Verified format: `<filename>-module__<hash>__<originalClassName>` (e.g. `base-button-module__oY0U-W__primary`) |
| The generated class name format | **The same readable format in both dev and a real production build** | Verified directly — production did not strip the filename/readability the way one might assume "minified" implies |
| Import order of the components/modules on a page | Determines the **order of the compiled CSS** in production | Verified: `BaseButton`'s `.primary` rule appears before the page's own `.primary` rule in the real compiled CSS, matching import order exactly |

## Where Does This Run?

Entirely a build-time transformation — there's no client-side CSS Modules runtime. Next.js's build tooling scans `.module.css` files, rewrites every class selector to a unique generated name, and produces a plain static `.css` file that ships like any other stylesheet; the `styles` object a component imports is just a plain JS object mapping original class names to their generated equivalents, resolved once at build time. No JavaScript needs to run in the browser for the scoping to work — the uniqueness is baked into the class names themselves before the page ever loads.

## What Is This?

CSS Modules solve the oldest problem in plain CSS: global scope. Two components each writing `.primary` in an ordinary `.css` file would collide — whichever stylesheet loads last wins, silently overriding the other. Naming this file `*.module.css` instead tells Next.js's build tooling to treat every class selector as **locally scoped**: each gets rewritten to a name unique to that specific file, so the same class name in two different files can never collide.

```css
/* base-button.module.css */
.primary { background: blue; color: white; }
```

```tsx
import styles from './base-button.module.css'

export function BaseButton() {
  return <button className={styles.primary}>Click</button>
}
```

`styles.primary` isn't the string `"primary"` — it's whatever unique name Next.js generated for that class in that specific file.

> **Check yourself:** If two different `.module.css` files both define a class named `.card`, and both are used on the same page, does either one's styling ever leak into or override the other?

## Why Does It Exist?

Before CSS Modules (and before utility-first frameworks like Tailwind existed as a mainstream option), avoiding class-name collisions in a large app meant manual discipline — naming conventions like BEM, deeply nested selectors, or a single massive stylesheet everyone had to coordinate changes to. None of these are enforced by the tooling; they rely on every contributor following the convention correctly, forever. CSS Modules moves that guarantee from "convention people have to remember" to "a build-time transformation that makes collision structurally impossible" — verified directly in this demo, where two files could use the exact same class name with zero coordination and zero conflict.

## How It Works

### Scoping, verified with a deliberate same-name collision

This demo deliberately named a class `.primary` in **two** different files — `base-button.module.css` (blue) and `page.module.css` (red) — specifically to test whether they'd collide. Verified real rendered output:

```html
<button class="base-button-module__oY0U-W__primary" data-testid="base-button">Base Button (blue)</button>
<button class="page-module__So8GGG__primary" data-testid="page-button">Page Button (red)</button>
```

Two structurally different class names, each embedding the source filename and a unique hash. Fetching the real compiled CSS confirmed both rules present and correct, with their original distinct styling (`background:#00f` for one, `background:red` for the other) — no collision, no override, exactly as the local-scoping guarantee promises.

### The generated name format is readable in production too — verified directly, not assumed

It would be reasonable to assume a production build replaces the readable `base-button-module__oY0U-W__primary` format with something fully opaque (e.g., just a short hash) for minification's sake. Verified directly against a real `npm run build` + `npm run start`: the exact same readable format — `<filename>-module__<hash>__<className>` — appeared in the production HTML and CSS, unchanged from dev. The "minification" that does happen in production is about the CSS *rule content* (whitespace/formatting stripped, as seen in the compiled output), not about stripping this debugging-friendly class name structure.

### Import order determines compiled CSS order — verified against the docs' own example, for real

The docs describe this exact scenario: a page importing `<BaseButton>` (which itself imports `base-button.module.css`) before importing its own `page.module.css` should result in `base-button.module.css`'s rules appearing first in the compiled output, because Next.js's chunking follows import order. This demo mirrors that structure precisely and confirmed it directly by fetching the real compiled CSS chunk:

```css
.base-button-module__oY0U-W__primary{color:#fff;background:#00f;border:none;padding:8px 16px}
.page-module__So8GGG__primary{color:#fff;background:red;border:none;padding:8px 16px}
```

`base-button`'s rule genuinely appears first — not because of specificity or file-path alphabetization, but because `BaseButton` is imported (and therefore its CSS module is imported) before `page.module.css` in `page.tsx`'s own import statements. This matters concretely: if the page's own `.primary` were meant to override `BaseButton`'s styling for some shared class, import order — not just which rule "looks more specific" — is what decides which one wins when specificity is otherwise equal.

## Gotchas

- **The `.module.css` suffix is what triggers scoping — a plain `.css` file is global**, and mixing the two conventions carelessly (importing a `.css` file expecting Module-style scoping) silently produces ordinary global CSS with no collision protection at all.
- **Production doesn't strip the readable class-name format** — verified directly. Don't assume `npm run build` output is unreadable/opaque; the filename and original class name both remain visible in the generated selector, which is actually useful for debugging a production issue via dev tools.
- **CSS ordering follows import order, not file path or alphabetical order** — verified directly by controlling which component's module gets imported first and observing that same order reflected in the compiled CSS. Two rules of equal specificity will have their cascade conflict resolved by whichever was imported later, not by any other implicit rule.
- **The docs' own recommendation to keep CSS imports predictable applies directly here**: an auto-sorting import linter (like ESLint's `sort-imports`) could silently reorder imports and, in turn, silently change which of two equal-specificity rules wins in production — worth disabling for exactly this reason on a project relying on import-order-sensitive CSS.

## Interview Questions

**Q (High): Two different `.module.css` files both define a class named `.card`, and a single page uses both. What happens to the styling?**

Answer: Nothing collides — CSS Modules generate a unique class name per file at build time, so `styles.card` from one file and `styles.card` from the other resolve to two structurally different real class names. Verified directly in this demo with a deliberate same-name test (`.primary` in two files): the rendered output showed two distinct generated names (`base-button-module__oY0U-W__primary` vs. `page-module__So8GGG__primary`), and the compiled CSS confirmed both rules present with their own distinct styling, unaffected by each other.

The trap: assuming CSS Modules work like a naming *convention* (e.g., "just don't reuse names") rather than a build-time *guarantee* — the whole point is that reusing a name across files is completely safe, not merely discouraged.

**Q (Medium): Does a production build (`npm run build`) produce fully opaque, unreadable class names for CSS Modules, the way minified JavaScript variable names are unreadable?**

Answer: No — verified directly against a real production build. The generated class name format (`<filename>-module__<hash>__<originalClassName>`) is identical in both dev and production; what actually gets minified is the CSS rule *content* (whitespace and formatting stripped), not the class name's structure. This is deliberately debugging-friendly — a class name spotted in production dev tools still tells you which source file and which original class it came from.

The trap: assuming "production build" implies "everything gets maximally obfuscated" — CSS Modules specifically preserve enough structure in the class name to remain debuggable, even in a minified production bundle.

**Q (Medium): A `BaseButton` component and a page both define a class `.primary` with conflicting styles. If both ended up applying to the exact same element with equal CSS specificity, which one would actually win, and why?**

Answer: Whichever was imported later in the compiled CSS's actual output order — CSS Modules don't change how the cascade resolves equal-specificity conflicts; they just guarantee the class *names* themselves don't collide. Since Next.js orders the compiled CSS by import order (verified directly: `BaseButton`'s module, imported first, produced CSS appearing first in the real compiled output), the *later*-imported rule wins the cascade in a true tie. This means import order isn't just a cosmetic detail — it has real cascade consequences whenever two locally-scoped classes are deliberately applied to the same element.

The trap: assuming CSS Modules eliminate cascade-conflict reasoning entirely because "the names don't collide" — the names not colliding is a separate guarantee from which rule wins when two different (non-colliding) classes are both applied to one element with equal specificity.

**Q (Low): Why might a project want to disable an auto-import-sorting ESLint rule when using CSS Modules extensively?**

Answer: Because CSS ordering in the compiled output directly follows import order (verified directly in this demo), an auto-sorter that silently reorders import statements alphabetically could silently change which locally-scoped rule wins a cascade tie for elements using classes from multiple modules — a real, hard-to-notice regression that has nothing to do with the JS/TS behavior the linter rule is actually designed to police.

The trap: treating import-order-sorting rules as purely cosmetic/harmless for a project's JavaScript, without considering the CSS-ordering side effect they can introduce when CSS Modules are involved.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain precisely why two `.module.css` files can safely reuse the same class name with zero collision
- [ ] Can state that production builds keep the readable `<filename>-module__<hash>__<class>` format, not a fully opaque hash
- [ ] Can explain why import order — not file path or specificity alone — determines compiled CSS order
- [ ] Can describe a concrete scenario where import order affects which of two equal-specificity rules actually wins
- [ ] Knows a `.css` file without the `.module.css` suffix gets no scoping at all

---
*Next: Global styles & the root layout — the deliberately *un*-scoped counterpart to this topic, and where
Next.js requires global CSS to be imported to avoid the stylesheet-removal caveat the docs call out.*
