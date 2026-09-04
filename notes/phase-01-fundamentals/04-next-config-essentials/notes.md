# `next.config.ts` Essentials

## Quick Reference

| Option | What it controls |
|---|---|
| `images.remotePatterns` | Allowlist of external domains `next/image` may optimize (Phase 8) |
| `redirects()` / `rewrites()` | URL-level routing rules — browser URL changes vs. stays hidden |
| `headers()` | Custom response headers (security headers, caching, CORS) |
| `output: 'standalone'` | Produces a minimal, self-contained server bundle for Docker/self-hosting (Phase 14) |
| `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` | Escape hatches to unblock a build despite errors — use sparingly |
| `reactStrictMode` | Toggles React's development double-invoke checks |

## Where Does This Run?

Build-time and server-startup — `next.config.ts` is read once when `next dev`, `next build`, or `next start` runs. It is **not** re-evaluated per request. Anything inside it that needs to vary per request belongs in Middleware (Phase 7) or a Route Handler (Phase 6), not here.

## What Is This?

`next.config.ts` (or `.js`/`.mjs`) is the single file where you configure behavior that can't be expressed through the file-convention system alone: build output shape, allowed image domains, redirect/rewrite rules, custom headers, and experimental feature flags. It exports one `NextConfig` object (TypeScript support for the file itself, via a `satisfies NextConfig` or typed export, is a relatively recent addition — historically this was plain `.js`).

> **Check yourself:** If you need a redirect rule that depends on the logged-in user's role, does it belong in `next.config.ts`? Why or why not?

## Why Does It Exist?

File-based routing and layouts (Phase 2) express *what routes exist and how they nest* — they say nothing about cross-cutting build and infra concerns: which external image hosts are trusted, what security headers every response should carry, how the production bundle should be packaged for deployment. Those are project-wide policies, not per-route logic, so they live in one central, statically-evaluated config file rather than being scattered across route files.

## How It Works

Some options are plain static values (`reactStrictMode: true`, `images.remotePatterns: [...]`). Others — `redirects()`, `rewrites()`, `headers()` — are **async functions** that Next.js calls once at build/startup to produce a list of rules; those rules then become part of the routing table the server consults on every request, but the *function itself* doesn't re-run per request:

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/old-blog/:slug', destination: '/blog/:slug', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/proxy/:path*', destination: 'https://api.example.com/:path*' },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }],
  },
};

export default nextConfig;
```

**Redirects vs. rewrites — the classic distinction:** a redirect sends the browser a 3xx response and the URL bar changes to the new destination; a rewrite serves different content *without* changing the URL the user sees, functioning like an internal proxy. `permanent: true` on a redirect emits a 308 (permanent); `false` emits a 307 (temporary) — this maps directly to SEO consequences (permanent redirects pass link equity, temporary ones don't).

> **Check yourself:** A user requests `/old-blog/hello`. With the `redirects()` config above, what does the browser's address bar show after the response? What would it show if that same rule were written as a `rewrite` instead?

## Gotchas

- **Config values aren't "live."** Changing `next.config.ts` and expecting an already-running production server to pick it up without a restart/redeploy is a common wrong assumption — it's fixed at process startup.
- **Confusing redirects and rewrites** is the single most common mistake — a rewrite that should have been a redirect leaves the user on a confusing stale URL; a redirect that should have been a rewrite unnecessarily exposes an internal API path to the client.
- **`ignoreBuildErrors` / `ignoreDuringBuilds`** silence real TypeScript/ESLint failures to force a build through — reaching for these as a default rather than a last resort is a red flag in a code review context.

## Interview Questions

**Q (High): What's the actual difference between `redirects()` and `rewrites()` in `next.config.ts`, including the HTTP-level detail?**

Answer: A redirect returns a 3xx response, and the browser's URL bar updates to the new destination — the client makes a new request. A rewrite serves the destination's content for the original URL without changing what the browser shows; it's resolved server-side, transparent to the client. Redirects additionally carry SEO weight via the `permanent` flag (308 vs 307).

The trap: describing them as functionally interchangeable "URL mapping" without the client-visible-URL distinction, or forgetting the 307/308 status-code implication of `permanent`.

**Q (High): Is `next.config.ts` re-evaluated on every incoming request?**

Answer: No — it's read once at build time (for build-time-relevant options) and at process startup for the running server. Per-request dynamic logic doesn't belong here; that's what Middleware or Route Handlers are for.

The trap: assuming config-driven redirects/rewrites can encode per-request dynamic conditions (like "redirect only if this cookie is missing") — that requires Middleware (Phase 7), not `next.config.ts`.

**Q (Medium): What does `output: 'standalone'` do, and when would you reach for it?**

Answer: It produces a minimal, self-contained build output — just the files needed to run the server, with a pruned `node_modules` — intended for containerized/self-hosted deployments (Docker) where you don't want the full project plus dev dependencies in the image. Covered fully in Phase 14.

The trap: confusing it with static export (`output: 'export'`), which is a completely different mode that disables server-side features entirely.

**Q (Medium): How do you allow `next/image` to optimize images from an external domain, and why is this an allowlist rather than open by default?**

Answer: Via `images.remotePatterns` in `next.config.ts`, specifying protocol/hostname (and optionally path/port patterns). It's an allowlist for security — without it, the image optimizer could be abused as an open proxy to fetch and re-serve arbitrary external URLs through your server's resources.

The trap: not knowing this is a security control, not just a convenience config.

**Q (Low): Can `next.config.ts` read environment variables, and are there any constraints on doing so?**

Answer: Yes, via `process.env` inside the config file, since it runs in a Node.js context at build/startup — but only variables available *at build/start time* are usable there; anything meant to vary at request time won't work through config.

The trap: assuming config-time env access behaves the same as runtime env access inside a Server Component or Route Handler (Topic 6 covers that distinction in depth).

---

## Self-Assessment

- [ ] Can explain redirects vs. rewrites including the HTTP status code detail, without notes
- [ ] Knows `next.config.ts` is evaluated at build/startup, not per request
- [ ] Can name the security reason `images.remotePatterns` is an allowlist
- [ ] Can distinguish `output: 'standalone'` from static export
- [ ] Would flag reaching for `ignoreBuildErrors` as a default rather than a last resort

---
*Next: TypeScript setup & path aliases in Next.js — the other file, `tsconfig.json`, that `create-next-app` scaffolds alongside `next.config.ts`, and what Next-specific behavior it enables.*
