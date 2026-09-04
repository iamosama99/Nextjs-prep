# File-Based Routing Fundamentals (`page.tsx`, `layout.tsx`)

## Quick Reference

| File name | What it does |
|---|---|
| `page.tsx` | Makes the folder a **publicly accessible route** — required for a URL to exist |
| `layout.tsx` | Wraps `page.tsx` and everything nested below it; persists across navigation (Topic 2) |
| Any other file | Ignored by the router entirely — safe to colocate components, hooks, utils |
| Folder name | Becomes the URL segment — `app/blog/` → `/blog` |

## Where Does This Run?

The route tree itself is resolved at build time (Next.js scans `app/` to construct it); each matched `page.tsx` then executes as a Server Component on the server by default, unless it opts into `'use client'` (Phase 4).

## What Is This?

The App Router assigns meaning to a small, fixed set of **reserved file names** inside nested folders under `app/`. Two matter most: `page.tsx`, which makes a folder's URL segment an actual navigable route with UI, and `layout.tsx`, which wraps that page (and any nested pages below it) in shared UI. Everything else you put in that same folder — a `Button.tsx`, a `utils.ts`, a `styles.module.css` — is invisible to the router. It's just a file that happens to live near the route that uses it.

> **Check yourself:** You create `app/dashboard/Chart.tsx`. Does this create a route at `/dashboard/Chart`?

## Why Does It Exist?

Pages Router made *every* file under `pages/` a route by default — which meant any component you wanted to colocate near the page that used it had to live somewhere else entirely (a separate `components/` tree), because putting it in `pages/` would have accidentally exposed it as a URL. App Router deliberately inverts this: routes are opt-in, triggered only by the reserved `page.tsx` (or `route.ts` for an API endpoint, Phase 6) filename. Everything else in that folder is just a normal file. This is what makes **colocation** — keeping a route's components, tests, and helpers physically next to the route that owns them — a first-class, encouraged pattern instead of something you have to work around.

## How It Works

Next.js walks the `app/` directory tree and builds a route table from folder nesting, keyed on the presence of these reserved filenames at each level:

| File | Role |
|---|---|
| `page.tsx` | The unique UI for this exact route — makes the segment navigable |
| `layout.tsx` | Shared UI wrapping this segment and everything nested inside it |
| `loading.tsx` | Instant loading UI shown while this segment's data resolves (Phase 2, Topic 9) |
| `error.tsx` | Error boundary scoped to this segment (Phase 2, Topic 10) |
| `not-found.tsx` | UI shown when `notFound()` is called or no route matches (Phase 2, Topic 11) |
| `route.ts` | An API endpoint instead of a page — mutually exclusive with `page.tsx` in the same folder (Phase 6) |
| `template.tsx` | Like a layout, but remounts on every navigation (Phase 2, Topic 3) |

A folder becomes a real, navigable URL **only** if it (or a descendant, for nested routes) contains a `page.tsx`. A folder with only a `layout.tsx` and no `page.tsx` of its own is not itself a route — it exists purely to wrap whatever nested routes live beneath it:

```
app/
  dashboard/
    layout.tsx      ← shared shell, NOT itself a route
    settings/
      page.tsx      ← this makes /dashboard/settings navigable
```

Here, `/dashboard` alone is **not** a valid route — visiting it 404s — because there's no `page.tsx` directly inside `dashboard/`. Only `/dashboard/settings` exists.

> **Check yourself:** Given the tree above, what would you need to add for `/dashboard` itself to become a valid, navigable route?

## Gotchas

- **A folder alone creates nothing.** This is the single most common early mistake coming from Pages Router intuition — creating `app/about/` with no `page.tsx` inside it produces no route at all, silently.
- **Filenames must match exactly.** `Page.tsx`, `index.tsx`, or any other variant is not recognized — only the exact lowercase reserved names (`page.tsx`, `layout.tsx`, etc.) are special. Everything else, including a differently-cased version of a reserved name, is just an ordinary file to the router.
- **Colocated files are genuinely safe.** Unlike Pages Router, where any stray file in `pages/` became a route, dropping `Chart.tsx`, `utils.ts`, or a test file directly next to `page.tsx` in the same App Router folder has zero routing consequence — this is intentional, not a loophole.

## Interview Questions

**Q (High): What actually makes a folder under `app/` a navigable route — is the folder's existence enough?**

Answer: No. Only the presence of a `page.tsx` file (directly in that folder, or `route.ts` for an API endpoint) makes a URL segment navigable. A folder that exists purely to hold a `layout.tsx` for its children, with no `page.tsx` of its own, is not itself a reachable route.

The trap: assuming folder structure alone defines every reachable URL — nested folders without a `page.tsx` are structural, not routable.

**Q (High): How does colocating a component file in the same folder as `page.tsx` avoid accidentally creating a new route — and how is this different from how Pages Router worked?**

Answer: App Router only treats a small, exact set of reserved filenames (`page.tsx`, `layout.tsx`, `route.ts`, etc.) as routing-significant; any other file — `Chart.tsx`, `utils.ts` — is invisible to the router regardless of where it sits in the tree. Pages Router had no such distinction: every file directly under `pages/` became a route by convention, which meant colocating a helper component there would have exposed it as a real URL, forcing teams to keep components in a separate directory entirely.

The trap: describing colocation as "just a nice pattern" without explaining the actual mechanism (reserved-filename opt-in) that makes it safe.

**Q (Medium): List the reserved special file names the App Router recognizes and what each one controls, at a high level.**

Answer: `page.tsx` (the route's UI), `layout.tsx` (persistent wrapping UI), `loading.tsx` (instant loading state), `error.tsx` (segment-scoped error boundary), `not-found.tsx` (404 UI), `route.ts` (an API endpoint instead of a page), and `template.tsx` (a layout-like wrapper that remounts on every navigation instead of persisting).

The trap: only naming `page.tsx` and `layout.tsx` and stopping there — a senior-level answer should know the full convention surface even if later phases go deeper on each.

**Q (Medium): Given `app/dashboard/layout.tsx` and `app/dashboard/settings/page.tsx` with no `page.tsx` directly inside `app/dashboard/`, is `/dashboard` itself a valid, reachable route?**

Answer: No — `/dashboard/settings` is reachable, but `/dashboard` alone 404s, because a `page.tsx` is required at that exact segment for it to be navigable; the layout alone doesn't make its own segment a route.

The trap: assuming any folder in the chain leading to a valid route is itself reachable.

**Q (Low): Can you rename `page.tsx` to `Page.tsx` or `index.tsx` and have Next.js still recognize it as the route's UI?**

Answer: No — the router matches on the exact, case-sensitive reserved filename `page.tsx` (or `page.jsx`/`page.js`). Any other name, including a differently-cased version, is treated as an ordinary, non-routed file.

The trap: assuming the convention is case-insensitive or has aliases, the way some file-lookup systems do.

---

## Self-Assessment

- [ ] Can state, without notes, exactly what makes a folder a reachable route
- [ ] Can explain why colocating a component next to `page.tsx` is safe in App Router but wasn't in Pages Router
- [ ] Can list at least five of the seven reserved special file names and what each does
- [ ] Can identify, given a folder tree, which segments are and aren't actually navigable
- [ ] Knows the reserved filenames must match exactly — no aliases, no case-insensitivity

---
*Next: Root layout & nested layouts — now that you know `layout.tsx` wraps a route, see exactly how nesting works, what persists across navigation, and what a layout can and can't access.*
