# Proxy Basics & the `matcher` Config

**Demo:** the project's single root `proxy.ts`, dispatching to `proxy-logic/topic-01-basics.ts` for
`/playground/phase-07-proxy-edge/01-proxy-basics`. Verified for real: `curl -i` against that path shows
`x-proxy-basics: ran`; the identical check against a Phase 6 route shows no such header — proof the
`matcher` genuinely scopes execution, not just that the logic happens to no-op elsewhere.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `proxy.ts` at the project root | The current (Next.js 16) name for what was `middleware.ts` | Same functionality, renamed — `middleware.ts` is deprecated, not removed |
| `export function proxy(request)` | The single function this file must export (named `proxy`, or a default export) | Only one function, one file, per project — no stacking multiple proxy files |
| `export const config = { matcher: [...] }` | Which paths actually invoke the function | Without it, proxy runs on **every** request, including static assets |
| `NextResponse.next()` | "Continue as normal" — the proxy equivalent of a no-op | Distinct from every other `NextResponse` method, which all short-circuit or redirect/rewrite |

## Where Does This Run?

Server-side, before a request reaches a page or Route Handler — proxy is explicitly positioned as running *before* routing resolves, not as part of rendering any particular route. It defaults to (and, per Topic 5, is now locked to) the Node.js runtime.

## What Is This?

Starting in Next.js 16, what used to be called Middleware is called **Proxy** — the file is `proxy.ts` (or `.js`) instead of `middleware.ts`, the exported function is named `proxy` instead of `middleware`, and the functionality is otherwise unchanged. It's a single file at the project root (or inside `src/`, alongside `app/`) that runs before a request completes, with the ability to inspect the request and respond by rewriting, redirecting, modifying headers, or answering directly.

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = {
  matcher: '/about/:path*',
}
```

> **Check yourself:** If you rename a project's `middleware.ts` to `proxy.ts` but forget to rename the exported `middleware` function to `proxy`, does the file still work?

## Why Does It Exist?

Some request-handling decisions genuinely need to happen before any specific route's code runs — redirecting based on auth state, rewriting for A/B tests, setting headers uniformly across a whole section of an app. Proxy exists to give these cross-cutting concerns one place to live, positioned ahead of the normal routing pipeline (Topic 7 covers exactly where in that pipeline). The rename to "Proxy" (from "Middleware") is itself deliberate: the docs are explicit that "middleware" invited confusion with Express.js middleware and encouraged overuse, while "Proxy" better communicates what the feature actually is — a network boundary in front of the app that can run outside the main application runtime, and one Next.js recommends reaching for only when no better-fitting API exists.

## How It Works

### One file, one function, project-wide

The file must export exactly one function — named `proxy`, or as a default export. Multiple proxy functions from the same file aren't supported, and (this is the constraint that shapes this entire phase's demo) **only one `proxy.ts` is allowed per project at all**. The docs' own recommended answer to "but I have several unrelated concerns to handle" is to break logic into separate modules and import them into the one `proxy.ts` for centralized dispatch — exactly the structure this phase's demo uses: [`proxy.ts`](../../../proxy.ts) at the root imports from [`proxy-logic/topic-01-basics.ts`](../../../proxy-logic/topic-01-basics.ts) (and will grow to import from a module per topic across this phase) rather than each topic getting its own isolated file the way every other phase's topics could.

### `matcher` is what makes proxy selective — verified, not assumed

Without a `matcher`, proxy runs on **every request** — including static files under `_next/static`, image optimization requests, and anything in `public/`. This project's root `proxy.ts` scopes its `matcher` to `/playground/phase-07-proxy-edge/:path*` specifically. Verified directly: a request to a route under that prefix carries the `x-proxy-basics` header this topic's module sets; the identical check against an entirely different phase's route shows the header is genuinely absent — not because the logic silently declined to act, but because the request never reached this proxy's function at all for that path.

`matcher` accepts a single string, an array of strings, or an array of objects with `source` (the path pattern), and optional `locale`, `has`, and `missing` conditions for matching on headers, query parameters, or cookies. Path patterns support named parameters with modifiers (`:path*` for zero-or-more segments, `:path+` for one-or-more, `:path?` for zero-or-one) and full regex via parentheses.

```ts
export const config = {
  matcher: [
    {
      source: '/api/:path*',
      has: [{ type: 'header', key: 'Authorization', value: 'Bearer Token' }],
      missing: [{ type: 'cookie', key: 'session', value: 'active' }],
    },
  ],
}
```

### `matcher` values must be statically analyzable

The docs are explicit: `matcher` values need to be constants Next.js can analyze at build time — a dynamically computed array (built from a variable, a function call, an environment-dependent branch) is silently ignored rather than erroring. This is a genuinely easy mistake to make invisibly, since there's no build failure to catch it.

### Two parameters: `request` and `event`

Next.js calls the proxy function with `request` (a `NextRequest`) and, optionally, `event` (a `NextFetchEvent`) — declare only the ones actually used. `event` exposes `waitUntil(promise)`, which extends the proxy invocation's lifetime until a promise settles, useful for background work like logging that shouldn't block the response (Topic 6 covers this in depth as part of the migration-era feature set). A `NextProxy` type is available as a shorthand that infers both parameter types automatically.

### `NextResponse.next()` — the "keep going" signal unique to proxy

Every other `NextResponse` method (`.json()`, `.redirect()`, `.rewrite()`) produces a response that ends the request there. `.next()` is different: it means "apply whatever headers/cookies I've set, then continue routing normally" — there's no equivalent concept in a Route Handler (Phase 6 Topic 2 already flagged this: `.next()` has no meaning outside proxy, since a Route Handler is already the terminal handler with no further routing step to defer to).

## Gotchas

- **Only one `proxy.ts` per project.** Reaching for a second proxy file to keep concerns separated doesn't work the way it might in some other frameworks — the docs' answer is modules imported into the single file, not multiple proxy files.
- **No `matcher` means proxy runs on literally everything**, including static assets — a common, costly mistake if auth or heavy logic ends up unintentionally blocking CSS/JS/image requests.
- **`matcher` must be statically analyzable.** A computed value is silently ignored, not rejected — this fails quietly rather than loudly, worth testing explicitly rather than assuming a dynamically-built matcher works.
- **`middleware.ts` still technically works but is deprecated** — a codemod (`npx @next/codemod@canary middleware-to-proxy .`) exists specifically to automate the rename (Topic 6 covers this migration fully).

## Interview Questions

**Q (High): What changed between `middleware.ts` and `proxy.ts` in Next.js 16 — is this a new feature, a breaking change, or a rename?**

Answer: A rename with identical functionality. The file becomes `proxy.ts`, the exported function becomes `proxy` (or a default export), and everything else about how it behaves is unchanged. `middleware.ts` is deprecated, not removed, and an official codemod automates the migration.

The trap: treating this as a functional change requiring new logic, rather than recognizing it's purely a naming/convention update with a mechanical migration path.

**Q (High): What happens to a request under `_next/static` or `public/` if a project's `proxy.ts` has no `matcher` config at all?**

Answer: The proxy function runs on it, same as every other request — without a `matcher`, proxy runs on literally every request including static files, image optimization requests, and public assets. This is why the docs stress using a matcher (often with a negative-lookahead pattern) to exclude these paths, since unintentionally running auth logic or redirects against them can block CSS/JS/images from loading.

The trap: assuming Next.js automatically excludes static assets from proxy by default — it doesn't; that exclusion has to be explicit in the `matcher`.

**Q (Medium): A project needs proxy logic for both auth checks and A/B test rewrites. Can it have two separate `proxy.ts`-style files, one per concern?**

Answer: No — only one `proxy.ts` (or `.js`) is supported per project. The documented pattern for keeping concerns separated is to write each concern as its own module and import/compose them inside the single `proxy.ts`, which is exactly the structure this topic's own demo uses.

The trap: assuming proxy files can be split the way, say, Route Handlers can be split across many `route.ts` files at different paths — proxy is a single, project-wide file by design.

**Q (Medium): Can a `matcher` value be computed from a variable or an environment check at build time?**

Answer: No — `matcher` values need to be constants Next.js can statically analyze at build time. A dynamically computed value is silently ignored rather than causing a build error, which makes this a genuinely easy mistake to introduce without immediate feedback.

The trap: assuming an invalid or dynamic matcher would fail loudly (a build error, a runtime warning) — it doesn't; the matcher is just quietly not applied as intended.

**Q (Low): What does `NextResponse.next()` do, and is it usable inside a Route Handler the same way it's used in proxy?**

Answer: It signals "continue routing normally" after optionally attaching headers/cookies — it's proxy's way of saying "I looked at this request and chose not to intervene." It has no equivalent use inside a Route Handler (Phase 6 Topic 2), which is already the terminal handler for whatever request reaches it, with no further routing step for `.next()` to hand off to.

The trap: reaching for `.next()` inside a Route Handler out of habit from proxy code — it belongs specifically to proxy's "before routing resolves" position in the request lifecycle.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state that `middleware.ts`/`proxy.ts` is a rename, not a functional change, and name the codemod
- [ ] Can explain what happens to static assets when no `matcher` is configured
- [ ] Can explain why only one proxy file is allowed and what the documented workaround is
- [ ] Knows `matcher` values must be static constants, and that a dynamic one fails silently
- [ ] Can explain what `NextResponse.next()` means and why it has no Route Handler equivalent

---
*Next: Rewrites, redirects, and headers from Proxy — this topic covered proxy's shape and scoping; the next one covers what it actually *does* to a request/response once it decides to act.*
