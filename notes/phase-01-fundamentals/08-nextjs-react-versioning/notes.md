# Next.js Versioning & Its React Version Coupling

## Quick Reference

| Next.js major | Paired React version | Notable App Router capability tied to that React version |
|---|---|---|
| Next.js 13 | React 18 | Initial Server Components support |
| Next.js 14 | React 18 | Server Actions stabilized |
| Next.js 15 | React 19 | `useActionState`, `useOptimistic`, new form/`ref` handling as stable APIs |
| Next.js 16 | React 19.2 (canary) | View Transitions, `useEffectEvent`, `Activity` — still being incrementally stabilized in App Router |

## Where Does This Run?

Build/install-time — this is about which `react`/`react-dom` versions are installed as dependencies, and it has downstream runtime consequences (which hooks and Server Component behaviors are actually available) rather than being a runtime concept itself.

## What Is This?

Most libraries built "on top of" React declare React as a loose peer dependency (`"react": "^17 || ^18"`) and barely care which minor version is installed. Next.js's App Router is not like that: because React Server Components, streaming, and several App Router hooks rely on internal, not-yet-fully-public React APIs, a given Next.js major version is built and tested against one specific React version — bumping one without the other is unsupported and frequently breaks.

> **Check yourself:** Would you expect `npm install react@latest` alone, with Next.js left on an older major version, to be a safe upgrade in an App Router project? Why or why not?

## Why Does It Exist?

React Server Components didn't ship as a finished, stable public API and then get adopted by Next.js — the two were co-developed. Next.js's App Router has historically depended on React features still in React's **canary** release channel (ahead of React's own stable releases) because that's where RSC, streaming APIs, and new hooks were first available for a framework to build on. This is a fundamentally different relationship than "a UI library that happens to use React" — Next.js is, in effect, one of the primary places React's own team ships and validates next-generation rendering features before they're broadly stable elsewhere.

## How It Works

`create-next-app` installs a matching `react`/`react-dom` version as part of scaffolding — you don't choose it independently. Each Next.js major release documents (and enforces via `peerDependencies` ranges) which React version range it expects. When a Next.js major version bumps, it's frequently *because* a new React capability landed that the App Router needed — Next.js 15 requiring React 19 wasn't arbitrary version-number alignment, it's because stable `useActionState`, `useOptimistic`, and related form/ref improvements (covered in Phase 5) only exist starting in React 19. Next.js 16 goes a step further and explicitly ships React 19.2 as a **canary** release, not a stable one — the App Router is deliberately running ahead of React's own stable line to get View Transitions, `useEffectEvent`, and `Activity` before they're broadly stable.

Practically, this means:
- Upgrading Next.js major versions usually **requires** a React version bump too — the release notes for a Next.js major nearly always state the minimum React version.
- Manually forcing a React version *ahead of* what your Next.js version expects (e.g., installing a React canary build on top of stable Next.js 14) is explicitly unsupported and can break RSC internals in ways that don't produce a clear error message — because the coupling isn't just "features may be missing," it's shared internal implementation detail between the two packages at a given point in time.
- Next.js major versions also bump their **Node.js and TypeScript minimums** alongside the React coupling — Next.js 16 requires Node.js 20.9+ (dropping Node 18 entirely) and TypeScript 5.1+, which trips up upgrades on older CI images just as often as the React mismatch does.

> **Check yourself:** Why is "install a newer React version and see if it still works" a meaningfully riskier move in a Next.js App Router project than in almost any other React-based tool?

## Gotchas

- **Independently bumping `react`/`react-dom` without bumping `next`** (or vice versa) is the most common version-mismatch bug — it often doesn't fail loudly; it can produce subtle RSC serialization errors or hydration issues that look unrelated to versioning at first glance.
- **"Canary" isn't a Next.js-specific term** — it's React's own pre-release channel, and the fact that a *stable* Next.js release has historically depended on React canary builds for certain features is itself a notable, non-obvious fact worth being able to state plainly.
- **Lockfile drift**, where a transitive dependency pulls in a slightly different React version than the one Next.js expects, is a real-world source of these bugs — not just manual `npm install` mistakes.

## Interview Questions

**Q (High): Why is Next.js so tightly coupled to a specific React version, unlike most libraries built on top of React?**

Answer: Because App Router's core capabilities — Server Components, streaming rendering, and hooks like `useActionState`/`useOptimistic` — depend on React internals and APIs that were, at various points, only available in React's canary channel ahead of React's own stable releases. Next.js and React's RSC work were co-developed rather than Next.js simply consuming a finished, stable public API, so a given Next.js major version is built and tested against one specific React version rather than a broad compatible range.

The trap: giving a generic "frameworks always pin dependency versions" answer without naming *why* this pairing specifically is unusually tight — the RSC/canary relationship is the actual mechanism.

**Q (Medium): What happens if you manually upgrade `react`/`react-dom` without upgrading `next` (or the reverse)?**

Answer: It's unsupported and frequently breaks in ways that aren't obviously version-related — RSC serialization issues, hydration mismatches, or hook behaviors that silently don't match documentation, because the two packages share internal implementation assumptions at a given version pairing, not just a public API surface.

The trap: assuming a version mismatch would always throw a clear, obvious error — often it doesn't, which is exactly why this is a genuinely dangerous mistake to make casually.

**Q (Low): What is React's "canary" release channel, and why does it matter for Next.js specifically?**

Answer: Canary is React's pre-release channel where new features (like RSC APIs, new hooks) ship before they're part of a stable React release. Next.js has historically depended on canary React builds to deliver its newest App Router features ahead of React's own stable release cadence, which is why Next.js's own release notes specify exact React version requirements rather than a loose compatible range.

The trap: not knowing this channel exists, or assuming Next.js only ever depends on already-stable, publicly documented React releases.

**Q (Low): Besides the React version, what else does a Next.js major version bump typically raise the minimum requirement for?**

Answer: The minimum supported Node.js and TypeScript versions. Next.js 16, for example, requires Node.js 20.9+ (Node 18 support was dropped entirely) and TypeScript 5.1+ — worth checking alongside the React version when planning an upgrade, since an outdated CI image or local Node version can block the upgrade just as effectively as a React mismatch.

The trap: only checking `package.json`'s React version during an upgrade plan and being surprised by a Node-version failure in CI.

---

## Self-Assessment

- [ ] Can explain why Next.js's React coupling is tighter than a typical library-on-top-of-React relationship
- [ ] Can name at least one App Router capability tied to a specific React version bump
- [ ] Knows what React's canary channel is and why Next.js has depended on it
- [ ] Would flag manually bumping only one of `react`/`next` as a risky, unsupported move in code review
- [ ] Can explain why a version mismatch here often fails subtly rather than with a clear error
- [ ] Knows a Next.js major bump also raises Node.js/TypeScript minimums, not just the React version

---
*Next: Phase 2 — App Router: File Conventions & Routing. Phase 1 covered the project's shape and setup; Phase 2 is where the file-based routing system those files enable gets a full treatment, starting with `page.tsx`/`layout.tsx` fundamentals.*
