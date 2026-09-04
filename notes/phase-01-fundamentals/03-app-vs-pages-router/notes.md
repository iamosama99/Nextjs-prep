# App Router vs Pages Router (High-Level Orientation)

> This is an orientation pass. Full migration mechanics, and a rigorous "when Pages Router still makes sense" discussion, live in Phase 15. The goal here is to be able to place any file or API you encounter into the right routing system immediately.

## Quick Reference

| Concern | Pages Router (`pages/`) | App Router (`app/`) |
|---|---|---|
| Route file | `pages/blog/[slug].js` | `app/blog/[slug]/page.tsx` |
| Shared shell | `_app.tsx` (React tree) + `_document.tsx` (HTML doc) | `layout.tsx` (both, nestable per segment) |
| Data fetching | `getServerSideProps` / `getStaticProps` per page | `async` Server Components fetch inline, per segment |
| Rendering unit | Whole page renders after its data function resolves | Per-segment; can stream independently (Phase 3–4) |
| API endpoints | `pages/api/*.js` | `app/**/route.ts` (Route Handlers, Phase 6) |
| Component model | All client-rendered (plus SSR'd HTML) | Server Components by default, opt into client |

## What Is This?

Pages Router is Next.js's original routing system, present since Next.js 1.0. App Router, introduced in Next.js 13 and made the recommended default in 13.4, is a full replacement built around React Server Components, nested layouts, and streaming. **Both exist in the same Next.js install today** — they are not different versions of Next.js, they are two routing systems a single install can run simultaneously, keyed off whether a route lives under `pages/` or `app/`.

> **Check yourself:** Is Pages Router "the old version of Next.js"? What's actually true instead?

## Why Does It Exist?

Pages Router's model is: one file = one route = one data-fetching function = one render pass. That's simple, but it has a hard ceiling — you cannot nest layouts without re-fetching or re-rendering everything above them on navigation (any workaround is a manual, error-prone pattern on top of `_app.tsx`), you cannot fetch data for *part* of a page independently of the rest, and there's no way to stream a slow section while the fast parts render immediately. Those limitations aren't bugs — they're consequences of a routing model built before React Server Components existed.

App Router was built specifically to remove that ceiling: routing is folder-based and *nestable*, each segment can have its own layout that persists across child navigation, each segment can fetch its own data independently, and slow parts of the tree can stream in via Suspense without blocking the rest (Phase 3–4 go deep on this). None of that is retrofittable onto Pages Router's one-function-per-page model — it required a different architecture, not just new APIs.

## How It Works — The Conceptual Mapping

| You needed to... | Pages Router | App Router |
|---|---|---|
| Define a route | Create a file under `pages/` | Create a folder with `page.tsx` under `app/` |
| Share UI across pages | `_app.tsx` | `layout.tsx`, nestable at any folder depth |
| Control `<html>`/`<head>` | `_document.tsx` | The root `layout.tsx` directly |
| Fetch data before render | `getServerSideProps` (per request) / `getStaticProps` (build time) | `async` Server Component, `fetch` inline (Phase 3–4) |
| Build an API endpoint | `pages/api/hello.js` | `app/api/hello/route.ts` |
| Show a loading state | Hand-rolled, or a router-level custom `_app` hack | `loading.tsx` convention (Phase 2) |
| Handle a route-level error | Custom `_error.tsx`, page-scoped only | `error.tsx`, scoped to any segment (Phase 2) |

Because both systems can coexist, a real production codebase is often mid-migration: legacy pages still live in `pages/`, new features go into `app/`. If a URL is defined in both, **`app/` wins** — App Router takes routing precedence on any conflict.

> **Check yourself:** If `pages/settings.tsx` and `app/settings/page.tsx` both exist and define the route `/settings`, which one actually renders?

## Gotchas

- **"Pages Router is deprecated" is an overstatement.** It's not deprecated — it's fully supported and still the right choice for some codebases (Phase 15 makes the actual case). It's simply no longer the *default* or *recommended* starting point for new projects.
- **The two systems can silently coexist** in one project during migration, and routing conflicts resolve in favor of `app/` — not knowing this leads to confusing "why is my old page not loading anymore" debugging.
- **API routes look similar but aren't identical.** `pages/api/*.js` handlers use a Node-style `(req, res)` signature; App Router's Route Handlers (`route.ts`) use the Fetch API's `Request`/`Response` (Phase 6) — you cannot copy-paste one into the other.

## Interview Questions

**Q (High): What fundamentally changed between Pages Router and App Router — not the file names, the actual rendering model?**

Answer: Pages Router renders one page as a single unit: a single data-fetching function resolves, then the whole page renders. App Router renders a *tree of nested segments*, each of which can be a Server Component that fetches its own data independently, and each of which can stream into the response via Suspense without waiting on siblings. The unit of rendering (and caching, Phase 3) moved from "the page" to "the route segment."

The trap: answering only with surface differences (file naming, `getServerSideProps` vs `fetch`) without identifying that the underlying rendering unit itself changed.

**Q (High): Can `pages/` and `app/` coexist in the same Next.js project? What happens if they define the same route?**

Answer: Yes, they can coexist — this is the officially supported incremental migration path. If both define the same URL, App Router takes precedence.

The trap: saying they can't coexist, or not knowing which one wins on conflict.

**Q (Medium): Why couldn't Pages Router support nested layouts the way App Router does?**

Answer: Pages Router has exactly one shared wrapper (`_app.tsx`) applied uniformly to every page — there's no per-folder-depth layout concept, and no mechanism to keep an outer layout mounted (preserving its state) while only the inner content changes on navigation. Any nested-layout illusion had to be hand-built inside `_app.tsx` with manual logic, and it still couldn't give each layout level its own independent data fetching or avoid a full page re-render.

The trap: describing App Router's nested layouts as just "a folder structure" thing rather than a data-fetching and rendering-lifecycle capability Pages Router structurally couldn't offer.

**Q (Medium): If you're starting a brand-new project today, which do you pick, and why?**

Answer: App Router, as the officially recommended default — it has streaming, nested layouts, Server Components, and is where new Next.js features land first. Pages Router is the right call mainly when maintaining or incrementally extending an existing large Pages Router codebase where a full rewrite isn't justified.

The trap: an answer with no reasoning, or one that doesn't acknowledge Pages Router is still a legitimate choice in the right context (setting up Phase 15's deeper treatment).

**Q (Low): What Next.js version introduced App Router, and what version made it the default recommendation?**

Answer: Introduced (beta) in Next.js 13; became stable and the recommended default starting in 13.4.

The trap: confusing "introduced" with "recommended default" — they were different releases, months apart, because RSC-based routing needed to stabilize first.

---

## Self-Assessment

- [ ] Can state, without notes, the one-sentence architectural difference between the two routers (not just file-naming differences)
- [ ] Knows that `app/` wins on a routing conflict when both routers define the same URL
- [ ] Can explain why nested layouts specifically required a new architecture, not just new file conventions
- [ ] Can name the Pages Router equivalent of at least four App Router concepts (`_app`, `_document`, `getServerSideProps`, `pages/api`)
- [ ] Would not describe Pages Router as "deprecated" without qualification

---
*Next: `next.config.ts` essentials — the config file that governs both routers, and the build/runtime behaviors neither routing convention alone can express.*
