# Wrapping Third-Party Client-Only Libraries

**Demo:** `app/playground/phase-04-server-components-data/09-wrapping-third-party-libs` — run `npm run dev`, visit `/playground/phase-04-server-components-data/09-wrapping-third-party-libs`.

## Quick Reference

| You have | The problem | The fix |
|---|---|---|
| A library component using `useState`/`useEffect`, no `'use client'` | Breaks when imported directly into a Server Component | Wrap it in your own thin `'use client'` file, re-export it |
| The same library used *inside* an already-`'use client'` file | Works fine, no wrapper needed | The problem is specifically about *Server* Component usage |
| A library that transforms data into UI (syntax highlighting, markdown) but needs no browser API | The opposite problem — needlessly client-heavy | Move the transform itself to a Server Component; ship only the output |
| `@next/third-parties` | Pre-built, optimized wrapper components for specific popular scripts (GTM, GA, YouTube, Maps) | A related but separate concept from wrapping arbitrary libraries yourself |

## Where Does This Run?

This is a direct, practical application of Topic 2's boundary mechanics — nothing new executes anywhere new; the fix is entirely about *where the `'use client'` directive lives* relative to code you didn't write.

## What Is This?

Plenty of npm packages assume they'll be used the way React has worked for years: imported and rendered, full stop, with no concept of a server/client split. A library component that calls `useState` internally but has no `'use client'` directive of its own works fine when used from *another* Client Component — but fails when a Server Component tries to import and render it directly, because Next.js has no way to know, from the outside, that this component needs client capabilities.

```tsx
// acme-carousel has no 'use client' of its own
'use client'
import { useState } from 'react'
import { Carousel } from 'acme-carousel'

export default function Gallery() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>View pictures</button>
      {isOpen && <Carousel />} {/* Works — Gallery is already a Client Component */}
    </div>
  )
}
```

Used from *inside* `Gallery` (itself `'use client'`), `Carousel` works — it's already part of the client module graph, no separate boundary needed. Trying to render `<Carousel />` directly inside a Server Component, though, errors, because Next.js doesn't know `Carousel` uses client-only features.

> **Check yourself:** Without looking, explain why the exact same `Carousel` import works inside `Gallery.tsx` but fails inside a plain Server Component page — what's actually different about the two usages?

## Why Does It Exist?

You can't add `'use client'` to a library's own source without forking it, and plenty of maintainers haven't (yet, or ever) added the directive themselves. Rather than being stuck choosing between "make my whole page a Client Component just to use this one library" and "fork a dependency," the wrapper pattern lets you draw the boundary exactly once, in a file you own, around exactly the piece that needs it.

## How It Works

### The wrapper: one file, one export

```tsx
// app/carousel.tsx
'use client'
import { Carousel } from 'acme-carousel'
export default Carousel
```

```tsx
// app/page.tsx — a Server Component
import Carousel from './carousel'

export default function Page() {
  return (
    <div>
      <p>View pictures</p>
      <Carousel /> {/* Works now — Carousel is a Client Component via the wrapper */}
    </div>
  )
}
```

This is the identical technique Topic 2 described in the abstract ("create a Client Component wrapper that imports it and place the directive on the wrapper"), applied to a real, concrete case: a dependency's source is untouched; the boundary lives in a file you wrote and control.

### Advice if you're the one publishing a library

If you're building a component library yourself, add `'use client'` directly to the entry points that rely on client-only features — this lets *your* consumers import your components straight into their Server Components without needing to write this wrapper themselves. One caveat worth knowing: some bundlers strip `"use client"` directives during their own build step, so library authors sometimes need explicit bundler configuration (documented examples exist for esbuild-based toolchains) to preserve the directive in published output.

### The opposite problem: needlessly client-heavy libraries

Not every third-party-library problem is "it needs `'use client'` and doesn't have it." Some libraries exist purely to transform data into markup — a syntax highlighter, a markdown renderer — and don't need any browser API at all, yet get imported into a Client Component out of habit, shipping the entire transformation library to the browser for a result that's just static HTML:

```tsx
'use client'
import Highlight from 'prism-react-renderer' // ships the whole library to the browser

export default function Page() {
  const code = `export function hello() { console.log("hi") }`
  return <Highlight code={code} language="tsx" theme={theme}>{/* ... */}</Highlight>
}
```

If the transform can run entirely on the server, moving it there ships zero of that library's code to the browser — the client receives only the already-rendered markup:

```tsx
import { codeToHtml } from 'shiki' // never bundled for the client

export default async function Page() {
  const code = `export function hello() { console.log("hi") }`
  const highlightedHtml = await codeToHtml(code, { lang: 'tsx', theme: 'github-dark' })
  return <pre><code dangerouslySetInnerHTML={{ __html: highlightedHtml }} /></pre>
}
```

This is the mirror image of the wrapping pattern: instead of drawing a boundary *around* a client-only library to make it usable from a Server Component, you're recognizing a library *doesn't need* to be client-side at all and removing the boundary that was there out of habit.

### `@next/third-parties`: a related, narrower tool

For a specific set of very common integrations (Google Tag Manager, Google Analytics, Google Maps Embed, YouTube Embed), `@next/third-parties` ships pre-built, already-optimized components rather than requiring you to write your own wrapper — they handle loading strategy and script placement for you. This solves a related but distinct problem: it's not a general-purpose "wrap any library" mechanism, just a curated set of components for specific popular integrations. For everything else, the wrapper pattern above is the general tool.

## Gotchas

- **The wrapper is needed for Server Component usage specifically — not universally.** If a library is only ever used from within components that are already `'use client'`, no wrapper is needed at all; the problem only arises when a Server Component tries to import the library directly.
- **A library needing a wrapper is a signal, not just an obstacle.** If you're wrapping a lot of third-party code just to use it, it's worth checking whether the whole feature genuinely needs to be client-rendered, or whether (as with the syntax-highlighting example) some of that work could move server-side entirely instead.
- **Bundler directive stripping is a real, if occasional, gotcha for library authors** — a `'use client'` directive that looks correct in source can vanish from the published package if the build tooling isn't configured to preserve it, producing exactly the "works in a Client Component, breaks in a Server Component" symptom for consumers, with no obvious cause in their own code.

## Interview Questions

**Q (High): A third-party carousel library's component uses `useState` internally but ships with no `'use client'` directive. It works fine when used inside your own Client Component, but throws when imported directly into a Server Component. Why the difference, and what's the fix?**

Answer: Used inside an already-`'use client'` file, the library component is simply part of that file's client module graph — no separate boundary declaration is needed, since the entry point (your file) already has one. Imported directly into a Server Component, there's no boundary anywhere in that import chain telling Next.js this component needs client capabilities, so it errors. The fix is a thin wrapper file — your own `'use client'` file that imports and re-exports the library component — which the Server Component then imports instead of the library directly.

The trap: assuming the library itself is somehow broken or incompatible with Next.js — it works correctly in both cases; the fix is purely about where the boundary declaration lives, not about the library's actual code.

**Q (High): You're the maintainer of a component library. What can you do so your consumers don't have to write wrapper files for your client-only components?**

Answer: Add `'use client'` directly to the entry-point files of your library that use client-only features (`useState`, browser APIs) before publishing. This means the directive already exists in your published package's source, so a consumer's Server Component can import your component directly without needing its own wrapper. One thing to verify: some bundlers strip `'use client'` directives during their build step, so depending on your build tooling, you may need explicit configuration to ensure the directive survives into the published output.

The trap: assuming this is purely the consumer's problem to solve — library authors have a direct lever (shipping the directive themselves) that avoids pushing wrapper-writing onto every consumer.

**Q (Medium): A syntax-highlighting library is used inside a `'use client'` component, even though the highlighting itself doesn't need any browser API. What's the cost, and what's the fix?**

Answer: The entire highlighting library — tokenizer, theming logic, everything — ships to the browser as part of the client bundle, even though the final result is just static markup that could have been computed once on the server. The fix is the opposite of the wrapping pattern: move the transformation into a Server Component (using a server-capable equivalent library, or the same library if it works without browser APIs), and pass only the resulting HTML string to the client, shipping none of the transformation library's code at all.

The trap: only thinking of "third-party library problems" as "needs `'use client'` and doesn't have it" — the equally common, opposite problem is a library being needlessly bundled client-side when it never needed browser APIs in the first place.

**Q (Medium): When would you reach for `@next/third-parties` instead of writing your own `'use client'` wrapper?**

Answer: `@next/third-parties` is a curated set of pre-built, already-optimized components for a specific list of popular integrations (Google Tag Manager, Google Analytics, Google Maps Embed, YouTube Embed) — reach for it when your third-party need matches one of those specific integrations, since it handles loading strategy and script placement correctly out of the box. For anything outside that curated list — an arbitrary npm component library, an internal package, anything not on the supported list — the general-purpose wrapper pattern (your own thin `'use client'` file) is the applicable tool, since `@next/third-parties` doesn't cover arbitrary libraries.

The trap: treating `@next/third-parties` as a general solution to "wrapping third-party code" rather than a narrow, specific tool for a fixed list of integrations.

**Q (Low): Does a component need its own `'use client'` wrapper if it's only ever rendered as `children` passed into a Client Component from a Server Component (the Topic 3 pattern), rather than imported directly?**

Answer: No, and this is a different case entirely — if the component being passed as `children` is itself meant to stay server-rendered (like Topic 3's `Cart` example), it should specifically *not* get a `'use client'` wrapper, since the whole point of that pattern is keeping it server-only while still visually nesting inside a Client Component. The wrapper pattern in this topic applies specifically to third-party components that *do* need client capabilities and are missing their own directive — a different situation from a Server Component being composed into a Client Component's slot.

The trap: conflating "renders visually inside a Client Component" (Topic 3's composition pattern, no wrapper needed for genuinely server-only content) with "needs to actually be part of the client bundle" (this topic's wrapper pattern, for content that genuinely requires client capabilities).

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why the same library component works from inside a Client Component but fails from a Server Component
- [ ] Can write the minimal wrapper file pattern from memory
- [ ] Can explain what a library author can do to avoid consumers needing wrappers at all
- [ ] Can explain the opposite antipattern (needlessly client-heavy libraries) and its fix
- [ ] Can explain when `@next/third-parties` applies versus the general wrapper pattern

---
*Next: Common data-fetching antipatterns interviewers probe for — a synthesis pass over everything in this phase, framed as the specific mistakes senior interviews are designed to surface.*
