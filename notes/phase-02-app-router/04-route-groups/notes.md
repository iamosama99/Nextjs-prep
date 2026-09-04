# Route Groups `(folder)` for Organization

> **Live demo:** `npm run dev` → [/playground/phase-02-app-router/04-route-groups](http://localhost:3000/playground/phase-02-app-router/04-route-groups)

## Quick Reference

| Fact | Detail |
|---|---|
| Syntax | Wrap a folder name in parentheses: `(marketing)` |
| URL effect | **None** — the segment is entirely omitted from the resulting URL |
| Primary uses | Scoping a `layout.tsx` to a subset of routes without adding a URL segment; organizing a large route tree logically |
| Multiple root layouts | Possible, one per top-level route group — but their route sets must never overlap |

## Where Does This Run?

Purely a build-time routing/organization convention — it has no runtime behavior of its own beyond however the layout scoped to it behaves.

## What Is This?

A folder name wrapped in parentheses — `(marketing)`, `(shop)` — is a **route group**: it participates in nesting and can hold its own `layout.tsx`, but the folder name itself is stripped out of the final URL entirely. `app/(marketing)/about/page.tsx` is reachable at `/about`, not `/marketing/about`.

> **Check yourself:** Given `app/(shop)/products/page.tsx`, what's the actual URL for this route?

## Why Does It Exist?

Two problems route groups solve, and neither is possible without them:

1. **Applying a layout to only some routes at the root level, without forcing a URL prefix onto them.** Without route groups, giving `/about` and `/contact` a distinct "marketing site" layout — separate from, say, `/dashboard`'s app layout — would require nesting them under a real folder like `marketing/`, which would force the URLs to become `/marketing/about` whether you wanted that prefix or not. A route group lets the *file structure* reflect a logical grouping while the *URL* stays exactly what product wants.
2. **Organizing a large route tree without every organizational folder becoming a URL segment.** A big app might want `app/(auth)/login`, `app/(auth)/register`, and `app/(dashboard)/settings`, `app/(dashboard)/billing` purely to keep related routes visually grouped in the file tree and to give each group its own layout — with none of that grouping leaking into the URLs users actually see.

## How It Works

```
app/
  (marketing)/
    layout.tsx        ← applies only to /about and /contact
    about/
      page.tsx         → /about
    contact/
      page.tsx         → /contact
  (app)/
    layout.tsx        ← a different layout, applies only to /dashboard
    dashboard/
      page.tsx         → /dashboard
```

Both `(marketing)` and `(app)` sit directly under `app/`, each with its own `layout.tsx` — and because parenthesized segments are stripped from the URL, `/about` and `/dashboard` are siblings in the URL space despite living under different layouts in the file tree.

**Multiple root layouts** are a direct consequence of this: if `(marketing)/layout.tsx` and `(app)/layout.tsx` each independently render `<html>`/`<body>`, that's allowed — each is effectively its own root layout for the routes beneath it — **as long as their route sets never overlap.** If both groups defined a `page.tsx` that mapped to the identical final URL, Next.js would have two conflicting root layouts trying to own the same page, which is an error, not a resolvable ambiguity.

> **Check yourself:** If `(marketing)/pricing/page.tsx` and `(app)/pricing/page.tsx` both existed, what would happen — and why is this different from the `pages/` vs `app/` conflict-resolution rule from Phase 1, Topic 3?

## Gotchas

- **Assuming the parenthesized name shows up anywhere in the URL.** It never does — this trips up anyone reading a file path and mentally constructing the URL by including every folder name literally.
- **Two route groups defining the same effective URL is an error, not a fallback.** Unlike the `pages/` vs `app/` router-conflict rule (where `app/` simply wins), two route groups within `app/` itself that collide on the same final path produce a build-time conflict — there's no precedence rule to fall back on because they're the same router.
- **Route groups don't affect data fetching, caching, or rendering mode at all** — their only job is URL-path omission and enabling per-group layouts; it's purely an organizational and layout-scoping tool.

## Interview Questions

**Q (High): What effect does wrapping a folder in parentheses have on the resulting URL, and why would you deliberately do this?**

Answer: The parenthesized segment is completely omitted from the URL — `app/(marketing)/about/page.tsx` is reachable at `/about`, not `/marketing/about`. You'd do this to apply a distinct layout to a logical group of routes (a "marketing site" shell vs. a "dashboard" shell) without forcing an unwanted URL prefix onto those routes, or simply to keep a large route tree organized in the file system without that organization leaking into the URL space.

The trap: assuming route groups are purely cosmetic file-tree organization with no layout implication, missing their main real-world use case.

**Q (High): Can you have multiple different root layouts for different sections of your app? How?**

Answer: Yes — by giving each top-level route group its own `layout.tsx` that independently renders `<html>`/`<body>`, each group effectively becomes its own root layout for the routes nested beneath it. This works precisely because parenthesized segments don't appear in the URL, so `(marketing)/layout.tsx` and `(app)/layout.tsx` can sit side-by-side under `app/` while serving completely different route sets with different document shells.

The trap: not knowing this is possible, or thinking a Next.js app is limited to exactly one root layout — the *file*, not the *concept*, is what's singular per route group.

**Q (Medium): What happens if two sibling route groups both try to define a page for the exact same URL?**

Answer: It's a build-time conflict/error, not a resolvable precedence situation — unlike the `pages/` vs `app/` router-level conflict (where `app/` simply takes priority, Phase 1 Topic 3), two route groups colliding on an identical final path within the *same* App Router are two definitions competing to own one router, with no tiebreaker rule.

The trap: assuming the same "one router wins" logic that resolves `pages/`-vs-`app/` conflicts also applies inside `app/` itself between route groups — it doesn't, because there's only one router involved here.

**Q (Low): Do route groups affect data fetching or caching behavior at all?**

Answer: No — they're purely an organizational and layout-scoping mechanism. Whatever caching or rendering behavior a route has (Phase 3) is entirely independent of whether it happens to live inside a route group.

The trap: inventing a caching-related side effect for route groups that doesn't exist, confusing an organizational convention with a rendering one.

---

## Self-Assessment

- [ ] Can state, without notes, that parenthesized segments never appear in the URL
- [ ] Can explain the two concrete problems route groups solve (scoped layout without a URL prefix; tree organization)
- [ ] Can describe how multiple root layouts become possible via route groups
- [ ] Knows a same-URL collision between two route groups is a build error, not a precedence rule
- [ ] Can state plainly that route groups have zero effect on caching or rendering mode

---
*Next: Dynamic segments `[id]` — folders that capture a variable part of the URL into a typed parameter, including what changed about accessing that parameter in Next.js 15.*
