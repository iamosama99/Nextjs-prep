# `create-next-app` Anatomy & Project Structure

## Quick Reference

| Generated item | Purpose |
|---|---|
| `app/layout.tsx` | Required root layout — must render `<html>` and `<body>` |
| `app/page.tsx` | The route for `/` |
| `next.config.ts` | Build/runtime config, evaluated at build & startup (Topic 4) |
| `next-env.d.ts` | Auto-managed TS ambient types — never hand-edit |
| `tsconfig.json` | Includes the `next` TS plugin + path aliases (Topic 5) |
| `public/` | Static files served as-is from the site root (Topic 7) |

## Where Does This Run?

This is a project-setup/build-time concern, not a runtime behavior — but the files it creates each map to a specific runtime later (server, client, or build tooling), which is why understanding *what* got scaffolded matters before touching any of it.

## What Is This?

`create-next-app` is the official CLI scaffolder. Running `npx create-next-app@latest` walks through prompts — TypeScript, ESLint, Tailwind, a `src/` directory or not, App Router (default) vs Pages Router, an import alias, and Turbopack for dev — and produces a project that is *already* wired to Next's conventions correctly. Nothing about the output is optional boilerplate you could safely delete; every generated file exists because file-based routing and the build pipeline depend on it being there in a specific shape.

> **Check yourself:** Without looking, name three files `create-next-app` generates that a plain Vite scaffold would not.

## Why Does It Exist?

Next.js's routing and rendering are convention-driven — the framework infers behavior from file names and folder structure (`page.tsx`, `layout.tsx`, `loading.tsx`, and so on, covered fully in Phase 2). Getting that scaffolding exactly right by hand is easy to get subtly wrong — e.g., forgetting the root layout needs `<html>`/`<body>` (Pages Router never required this, since `_document.tsx` handled it separately). `create-next-app` guarantees a correct starting point and keeps the TypeScript, ESLint, and bundler configuration in sync with whatever Next.js version you scaffolded.

## How It Works — Walking the Generated Tree

**`app/layout.tsx`** — the root layout, required for every App Router project. Unlike a page, it doesn't unmount on navigation between sibling routes, and unlike Pages Router's `_app.tsx` + `_document.tsx` split, one file owns both the persistent shell *and* the actual `<html>`/`<body>` tags:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**`app/page.tsx`** — the UI for the `/` route. A `page.tsx` file is what makes a folder a navigable route at all; a folder with only a `layout.tsx` and no `page.tsx` is not itself a route (Phase 2 covers this in depth).

**`app/globals.css`** — imported once, in the root layout, and applies app-wide.

**`next.config.ts`** — read once at build/startup (Topic 4).

**`next-env.d.ts`** — a triple-slash-reference file Next.js regenerates automatically so the TypeScript compiler knows about Next's ambient types (like typed route params). It's listed in `.gitignore`'s spirit even though many teams commit it — either way, never hand-edit it; Next overwrites it.

**`tsconfig.json`** — pre-configured with `moduleResolution: "bundler"`, the `paths` alias (Topic 5), and a `plugins: [{ "name": "next" }]` entry that gives the editor Next-aware type checking (e.g. validating props passed to `page.tsx` match what Next expects).

**`public/`** — static files served from the site root untouched (Topic 7).

**`package.json` scripts** — `dev` (starts the dev server, Turbopack by default as of Next.js 15), `build` (production build), `start` (runs the production build), `lint`.

> **Check yourself:** Why does `app/layout.tsx` need to contain `<html>` and `<body>` when Pages Router never asked you to write those tags in a page component?

## `app/` vs `src/app/`

`create-next-app` asks whether to put your code inside a `src/` directory. This is purely organizational — Next.js looks for `app/` at the project root *or* inside `src/`, and behavior is identical either way. Teams pick `src/` to keep config files (`next.config.ts`, `package.json`, `.env`) visually separated from application code.

## Gotchas

- **Deleting the root layout's `<html>`/`<body>` "because it looks redundant"** breaks the app — App Router has no separate `_document.tsx` fallback to supply them.
- **Hand-editing `next-env.d.ts`** gets silently overwritten the next time the dev server or build runs — any manual type additions belong in a separate `.d.ts` file.
- **Assuming `app/` and `src/app/` behave differently** — they don't; it's a preference, not a config with behavioral consequences.

## Interview Questions

**Q (High): What does `create-next-app` actually configure, and why does the root layout's requirement to render `<html>`/`<body>` differ from how Pages Router handled the document shell?**

Answer: It scaffolds a project pre-wired to Next's file-convention routing, a matching TypeScript/ESLint config, and build tooling. In App Router, `app/layout.tsx` is the single file responsible for the persistent document shell — it must render `<html>` and `<body>` directly because there's no separate `_document.tsx`. Pages Router split this: `_app.tsx` wrapped every page's React tree, while `_document.tsx` controlled the actual HTML document structure and only ran on the server.

The trap: candidates who've only used Pages Router often try to add a `_document.tsx`-style file to App Router, not realizing that responsibility merged into the root layout.

**Q (High): Does putting your code in `src/app/` instead of `app/` change any Next.js behavior?**

Answer: No — it's purely organizational. Next.js checks for `app/` at the project root and inside `src/` and treats them identically.

The trap: inventing a behavioral difference that doesn't exist, or being unable to answer confidently either way.

**Q (Medium): Why shouldn't you manually edit `next-env.d.ts`?**

Answer: Next.js regenerates it automatically on `next dev` or `next build` to keep the ambient TypeScript types in sync with the installed Next.js version and enabled features (like typed routes). Manual edits get overwritten; project-specific type augmentation belongs in a separate `.d.ts` file.

The trap: not knowing the file is auto-managed and "fixing" a perceived issue in it, which then silently reverts.

**Q (Medium): What does the `next` TypeScript plugin (in `tsconfig.json`'s `plugins` array) actually give you that a stock TypeScript setup wouldn't?**

Answer: Editor-level, Next-aware type checking — for example, validating that a `page.tsx`'s exported props match what Next.js will actually pass in (like `params` and `searchParams`), and powering experimental features like typed `next/link` hrefs (`typedRoutes`).

The trap: describing it as "just linting" — it's compiler/editor tooling specific to Next's conventions, not a lint rule set.

**Q (Low): What does the import alias prompt (`@/*`) during setup actually configure, and where does it live?**

Answer: It writes a `paths` mapping into `tsconfig.json`'s `compilerOptions`. Next's bundler (Webpack or Turbopack) reads that same `tsconfig.json` and resolves the alias automatically — no separate bundler-level alias config is needed, unlike some other tooling setups.

The trap: assuming you need to configure the alias twice (once for TypeScript, once for the bundler).

---

## Self-Assessment

- [ ] Can list, from memory, at least five files/folders `create-next-app` generates and what each is for
- [ ] Can explain why the root layout owns `<html>`/`<body>` instead of a separate document file
- [ ] Can state confidently that `app/` vs `src/app/` has no behavioral difference
- [ ] Knows never to hand-edit `next-env.d.ts` and why
- [ ] Can explain what the `next` TS plugin adds beyond stock TypeScript

---
*Next: App Router vs Pages Router (high-level orientation) — now that you've seen what App Router scaffolds, contrast it with the routing system it replaced.*
