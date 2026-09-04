# Project Context — Next.js Interview Prep

> Hand this file to any new conversation to continue exactly where we left off.

---

## What This Project Is

A personal Next.js interview prep repository for a **senior frontend engineer**, built as the companion to `React-prep` (same drive, sibling folder). The goal is to cover **138 topics across 16 phases**, one topic at a time, at the learner's pace. Quality over speed — there is no rush.

Topics are generated as individual markdown files, exactly like `React-prep`. Each file is a standalone, self-contained reference — written to build genuine understanding, not to memorize facts.

### Relationship to React-prep — read this first

`React-prep` already covers, in depth: React Server Components, `use client`/`use server` fundamentals, Server Actions basics, Suspense, streaming SSR, hydration, CSR/SSR/SSG/ISR concepts, and a shallow orientation pass on Next.js App Router / Pages Router (`phase-11-modern-react`, `phase-12-ssr-frameworks`).

**This project does not re-teach those fundamentals.** Where a topic here assumes that prior knowledge, it says so explicitly and links back conceptually rather than re-deriving it. Everything in this repo is scoped to what is *actually Next.js-specific*: the file-convention routing system, the caching model (the single biggest senior-interview differentiator), Route Handlers, Middleware/Edge runtime, Metadata API, and Next.js's own performance/deployment story.

---

## Who You're Teaching

- Senior frontend engineer level — use correct terminology freely, don't oversimplify
- Already fluent in React internals (fiber, reconciliation, hooks, RSC boundaries) via `React-prep` — never re-explain these from scratch, reference them
- Prefers intuitive understanding over rote knowledge: reasoning and "why" matter as much as "what"
- Wants to connect the dots between concepts — each topic should feel like a logical step from the last
- No caps on length, no caps on number of interview questions — go as deep as the topic warrants
- Code examples: **TypeScript throughout** (this repo starts where `React-prep` phase 9 left off — no plain-JS phase)
- Next.js version target: **Next.js 15+ (App Router, React 19)** — note Pages Router only where explicitly relevant (Phase 15)

---

## How to Continue

When the user says **"next"**, generate the next topic in sequence (see progress tracker below).
When the user names a **specific topic**, jump directly to it.

Write the topic as a markdown file and save it to the correct path (listed per topic below).
After writing, commit it with `git add <file> && git commit`.

---

## Content Format — Follow This For Every Topic

Same proven structure as `React-prep`, with one addition specific to Next.js: every topic must be explicit about **where code runs** (server, client, edge, build-time) since that boundary is the source of most Next.js interview traps.

```
# [Topic Name]

## Quick Reference

A small table (2–5 rows) or tight bullet list placed immediately after the title.
Maps the core concept → mechanism → practical implication at a glance.
A reader returning after weeks should be able to re-anchor in under 10 seconds
without re-reading the whole file.

Example shape:
| You write / see | What it actually is | Why it matters |
|---|---|---|
| `fetch(url)` in a Server Component | Deduped + cached by the Data Cache | Same URL across a tree = one network call |

Keep it to 2–5 rows. One idea per row. No prose.

## Where Does This Run?
One or two lines: server, client, edge middleware, or build-time — and what that
implies (bundle size, secrets access, cold starts, statelessness). Skip this
section only if the topic is pure convention with no runtime implication
(e.g. folder naming).

## What Is This?
Plain explanation of what the concept IS. Before any mechanics. Make it feel grounded.
One or two short paragraphs. A code snippet here is fine if it helps orient.

> **Check yourself:** [A tight question about the just-covered concept — forces the
> reader to actively recall before moving on. Think before scrolling.]

## Why Does It Exist?
The problem it solves in Next.js specifically. The history if relevant (what Pages
Router did instead, why App Router changed it). Why the API is designed this way.
If the reason is self-evident, keep this short. If it's non-obvious, go deep.

## How It Works
The mechanism. Internals where relevant (which cache layer, which lifecycle phase).
Mental models. Step-by-step if clarifying. Use code to show the mechanism, not
just the API.

> **Check yourself:** [A question that tests mechanical understanding — not just
> naming, but reasoning about cause and effect.]

## [Other sections as needed — use judgment]
E.g.: "The Old vs New Approach" (Pages Router comparison), "Side-by-Side Comparison",
"In Production", "Common Patterns", "Edge Cases". Name them for what they actually
cover. Only create a section if it genuinely adds value. No filler sections.
Each major section may have its own Check yourself prompt if it introduces a new
idea worth testing. Target 2–3 prompts per file total; don't pad.

## Gotchas
The real ones. The ones that trip people up in interviews or production — cache
staleness surprises, server/client boundary violations, runtime mismatches.
No padding. If there are two, write two. If there are six, write six.
Every gotcha that is interview-worthy must also appear as a Q&A entry below —
don't list it here and then omit it from the interview section.

## Interview Questions

Each question has an importance label: `High` (core concept, asked in almost every
senior interview on this topic), `Medium` (common but less universal), or `Low`
(edge case, rarely tested in typical senior interviews).

ORDER QUESTIONS from most to least important: High → Medium → Low.

**Q (Medium): [Question text]**

Answer: [What a senior engineer would say. Be complete — this is the reference answer.]

The trap: [What the interviewer is watching for. What weaker candidates say or miss.]

[Repeat for every question the topic genuinely warrants. No artificial cap.]

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.
Leave unchecked anything you'd need to read to answer — that's what to revisit.

- [ ] [Concrete capability: "Can explain X in one sentence without notes"]
- [ ] [Concrete capability: "Can write a minimal code example from memory"]
- [ ] [Concrete capability: "Can name the gotcha and explain why it happens"]
- [ ] [Add 2–4 more items specific to the topic — aim for 4–6 total]

---
*Next: [Next topic name] — [One sentence on why it follows naturally from this one.]*
```

---

## Style Rules

- Start every topic with **where it runs**, then **what it is**, **why it exists**, **how it works**
- Use plain language but exact terminology — never dumb down, never use vague words when a precise term exists
- Build reasoning from first principles — every constraint, API choice, and gotcha should feel logical
- Write the "how it works" sections as a senior engineer explaining over coffee, not as documentation
- Connect concepts to each other — reference prior topics (both this repo and `React-prep`) when relevant, set up the next topic at the end
- Always name the **Pages Router equivalent** in passing where one exists (senior interviews frequently ask "how did this used to work") — it does not need its own section, one line is enough unless Phase 15 covers it fully
- Never pad. If a section doesn't apply, don't invent content to fill it
- Interview questions: write as many as the topic genuinely warrants. Include the answer AND the trap

---

## Repository Structure

Unlike `React-prep` (a Vite SPA sandbox that can render any isolated component), Next.js's defining features — file-based routing, layouts, middleware, Route Handlers, caching — only exist inside a real Next.js project. So this repo pairs each topic's **notes** with a route inside one real, running Next.js app rather than a copy-pasted single-file sandbox.

```
Nextjs-prep/
├── CONTEXT.md                    ← this file
├── README.md                     ← full topic index (generate once Phase 1 starts)
├── notes/
│   ├── phase-01-fundamentals/
│   │   └── 01-why-nextjs/notes.md
│   ├── phase-02-app-router/
│   │   └── 01-file-based-routing/notes.md
│   └── ...                       ← one notes.md per topic, mirrors phase structure below
├── app/                          ← the real Next.js App Router project (scaffolded in Phase 1)
│   ├── layout.tsx
│   ├── page.tsx
│   └── playground/
│       ├── phase-02-app-router/
│       │   └── 01-file-based-routing/page.tsx
│       ├── phase-06-route-handlers/
│       │   └── 01-basics/route.ts
│       └── ...                   ← one route per topic that needs a live demo (not all do)
├── middleware.ts                 ← lives at root per Next.js convention (Phase 7 topics touch this)
├── next.config.ts
├── package.json
└── tsconfig.json
```

**Study workflow per topic:**
1. Read `notes/phase-XX/NN-topic/notes.md` — concept, internals, interview traps
2. If the topic has a live demo, run it: `npm run dev` from the project root, then visit
   `localhost:3000/playground/phase-XX/NN-topic` — Next.js Turbopack hot-reloads on save
3. Some topics (build config, deployment, middleware matchers) are read/reason-about
   only and won't have a route — the notes file will say so

**Note on scaffolding:** the `app/` Next.js project does not exist yet — it gets created
as part of executing **Phase 1, Topic 2** (`create-next-app` anatomy). Don't scaffold it
ahead of time; walking through the setup deliberately is itself part of the prep.

---

## Progress Tracker

Legend: ⬜ Not started | ✅ Done | 👉 **Next up**

### Phase 1 — Next.js Fundamentals & Project Setup (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | What Next.js solves vs a plain React/Vite SPA | `notes/phase-01-fundamentals/01-why-nextjs/notes.md` | ✅ |
| 2 | `create-next-app` anatomy & project structure | `notes/phase-01-fundamentals/02-create-next-app-anatomy/notes.md` | ✅ |
| 3 | App Router vs Pages Router (high-level orientation) | `notes/phase-01-fundamentals/03-app-vs-pages-router/notes.md` | ✅ |
| 4 | `next.config.ts` essentials | `notes/phase-01-fundamentals/04-next-config-essentials/notes.md` | ✅ |
| 5 | TypeScript setup & path aliases in Next.js | `notes/phase-01-fundamentals/05-typescript-setup/notes.md` | ✅ |
| 6 | Environment variables (`.env`, `NEXT_PUBLIC_` prefix) | `notes/phase-01-fundamentals/06-environment-variables/notes.md` | ✅ |
| 7 | Static assets & the `public/` folder | `notes/phase-01-fundamentals/07-static-assets-public-folder/notes.md` | ✅ |
| 8 | Next.js versioning & its React version coupling | `notes/phase-01-fundamentals/08-nextjs-react-versioning/notes.md` | ✅ |

### Phase 2 — App Router: File Conventions & Routing (12 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | File-based routing fundamentals (`page.tsx`, `layout.tsx`) | `notes/phase-02-app-router/01-file-based-routing/notes.md` | ✅ |
| 2 | Root layout & nested layouts | `notes/phase-02-app-router/02-nested-layouts/notes.md` | ✅ |
| 3 | Templates vs layouts | `notes/phase-02-app-router/03-templates-vs-layouts/notes.md` | ✅ |
| 4 | Route groups `(folder)` for organization | `notes/phase-02-app-router/04-route-groups/notes.md` | ✅ |
| 5 | Dynamic segments `[id]` | `notes/phase-02-app-router/05-dynamic-segments/notes.md` | ✅ |
| 6 | Catch-all & optional catch-all `[...slug]` / `[[...slug]]` | `notes/phase-02-app-router/06-catch-all-segments/notes.md` | ✅ |
| 7 | Parallel routes `@slot` | `notes/phase-02-app-router/07-parallel-routes/notes.md` | 👉 |
| 8 | Intercepting routes `(.)/(..)/(...)` | `notes/phase-02-app-router/08-intercepting-routes/notes.md` | ⬜ |
| 9 | `loading.tsx` & instant loading states | `notes/phase-02-app-router/09-loading-ui/notes.md` | ⬜ |
| 10 | `error.tsx` & error boundaries per route segment | `notes/phase-02-app-router/10-error-boundaries/notes.md` | ⬜ |
| 11 | `not-found.tsx` & `notFound()` | `notes/phase-02-app-router/11-not-found/notes.md` | ⬜ |
| 12 | Linking & navigating (`next/link`, `useRouter`, `usePathname`, `useSearchParams`) | `notes/phase-02-app-router/12-linking-and-navigating/notes.md` | ⬜ |

### Phase 3 — Rendering Model & Caching (12 topics)

> The single highest-leverage phase for senior interviews. Slow down here.

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Static vs dynamic rendering — how Next decides | `notes/phase-03-rendering-caching/01-static-vs-dynamic-rendering/notes.md` | ⬜ |
| 2 | Request Memoization (`fetch` dedupe within a render) | `notes/phase-03-rendering-caching/02-request-memoization/notes.md` | ⬜ |
| 3 | Data Cache (`fetch` cache, `force-cache` / `no-store`) | `notes/phase-03-rendering-caching/03-data-cache/notes.md` | ⬜ |
| 4 | Full Route Cache (build-time HTML/RSC payload cache) | `notes/phase-03-rendering-caching/04-full-route-cache/notes.md` | ⬜ |
| 5 | Router Cache (client-side prefetch cache) | `notes/phase-03-rendering-caching/05-router-cache/notes.md` | ⬜ |
| 6 | Time-based revalidation (`next: { revalidate }`) | `notes/phase-03-rendering-caching/06-time-based-revalidation/notes.md` | ⬜ |
| 7 | On-demand revalidation (`revalidatePath`, `revalidateTag`) | `notes/phase-03-rendering-caching/07-on-demand-revalidation/notes.md` | ⬜ |
| 8 | `generateStaticParams` & `dynamicParams` | `notes/phase-03-rendering-caching/08-generate-static-params/notes.md` | ⬜ |
| 9 | ISR in the App Router | `notes/phase-03-rendering-caching/09-isr-app-router/notes.md` | ⬜ |
| 10 | Route segment config (`force-dynamic` / `force-static` / etc.) | `notes/phase-03-rendering-caching/10-route-segment-config/notes.md` | ⬜ |
| 11 | React's `cache()` & per-request memoization | `notes/phase-03-rendering-caching/11-react-cache-function/notes.md` | ⬜ |
| 12 | Debugging cache behavior (stale/not-stale interview scenarios) | `notes/phase-03-rendering-caching/12-debugging-cache-behavior/notes.md` | ⬜ |

### Phase 4 — Server Components & Data Fetching (10 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Server Components by default — what runs where in Next.js | `notes/phase-04-server-components-data/01-server-components-by-default/notes.md` | ⬜ |
| 2 | The Client Component boundary (`'use client'`) in practice | `notes/phase-04-server-components-data/02-use-client-boundary/notes.md` | ⬜ |
| 3 | Composing server & client components (children pattern) | `notes/phase-04-server-components-data/03-composing-server-client/notes.md` | ⬜ |
| 4 | Fetching data directly in Server Components (async components) | `notes/phase-04-server-components-data/04-async-server-components/notes.md` | ⬜ |
| 5 | Parallel data fetching vs sequential waterfalls | `notes/phase-04-server-components-data/05-parallel-vs-waterfall-fetching/notes.md` | ⬜ |
| 6 | Streaming with Suspense boundaries in Next.js | `notes/phase-04-server-components-data/06-streaming-with-suspense/notes.md` | ⬜ |
| 7 | `server-only` / `client-only` packages | `notes/phase-04-server-components-data/07-server-only-client-only/notes.md` | ⬜ |
| 8 | Passing data across the server/client boundary (serialization limits) | `notes/phase-04-server-components-data/08-serialization-boundary/notes.md` | ⬜ |
| 9 | Wrapping third-party client-only libraries | `notes/phase-04-server-components-data/09-wrapping-third-party-libs/notes.md` | ⬜ |
| 10 | Common data-fetching antipatterns interviewers probe for | `notes/phase-04-server-components-data/10-data-fetching-antipatterns/notes.md` | ⬜ |

### Phase 5 — Server Actions & Mutations (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Defining Server Actions (`'use server'`) | `notes/phase-05-server-actions/01-defining-server-actions/notes.md` | ⬜ |
| 2 | Calling Server Actions from forms | `notes/phase-05-server-actions/02-server-actions-in-forms/notes.md` | ⬜ |
| 3 | `useFormStatus` & pending states | `notes/phase-05-server-actions/03-use-form-status/notes.md` | ⬜ |
| 4 | `useActionState` (form state + validation errors) | `notes/phase-05-server-actions/04-use-action-state/notes.md` | ⬜ |
| 5 | `useOptimistic` for optimistic UI | `notes/phase-05-server-actions/05-use-optimistic/notes.md` | ⬜ |
| 6 | Revalidating data after a mutation | `notes/phase-05-server-actions/06-revalidating-after-mutation/notes.md` | ⬜ |
| 7 | Server Action security (auth checks, not trusting the client) | `notes/phase-05-server-actions/07-server-action-security/notes.md` | ⬜ |
| 8 | Progressive enhancement (forms working without JS) | `notes/phase-05-server-actions/08-progressive-enhancement/notes.md` | ⬜ |

### Phase 6 — Route Handlers (APIs) (7 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Route Handler basics (`route.ts`, `GET`/`POST`/etc.) | `notes/phase-06-route-handlers/01-route-handler-basics/notes.md` | ⬜ |
| 2 | `NextRequest` / `NextResponse` | `notes/phase-06-route-handlers/02-nextrequest-nextresponse/notes.md` | ⬜ |
| 3 | Dynamic route handlers & params | `notes/phase-06-route-handlers/03-dynamic-route-handlers/notes.md` | ⬜ |
| 4 | Reading search params, headers, cookies in handlers | `notes/phase-06-route-handlers/04-reading-request-data/notes.md` | ⬜ |
| 5 | Streaming responses from a Route Handler | `notes/phase-06-route-handlers/05-streaming-responses/notes.md` | ⬜ |
| 6 | CORS & webhooks in Route Handlers | `notes/phase-06-route-handlers/06-cors-and-webhooks/notes.md` | ⬜ |
| 7 | Route Handlers vs Server Actions — when to use which | `notes/phase-06-route-handlers/07-route-handlers-vs-server-actions/notes.md` | ⬜ |

### Phase 7 — Middleware & Edge Runtime (7 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Middleware basics & the `matcher` config | `notes/phase-07-middleware-edge/01-middleware-basics/notes.md` | ⬜ |
| 2 | Rewrites, redirects, and response headers from middleware | `notes/phase-07-middleware-edge/02-rewrites-redirects-headers/notes.md` | ⬜ |
| 3 | Auth checks in middleware (cookie/session inspection) | `notes/phase-07-middleware-edge/03-auth-checks-in-middleware/notes.md` | ⬜ |
| 4 | Geolocation & A/B testing patterns | `notes/phase-07-middleware-edge/04-geolocation-ab-testing/notes.md` | ⬜ |
| 5 | Edge runtime vs Node.js runtime — constraints & tradeoffs | `notes/phase-07-middleware-edge/05-edge-vs-node-runtime/notes.md` | ⬜ |
| 6 | Per-route runtime selection (`export const runtime`) | `notes/phase-07-middleware-edge/06-per-route-runtime-selection/notes.md` | ⬜ |
| 7 | Middleware performance & execution-order gotchas | `notes/phase-07-middleware-edge/07-middleware-performance-gotchas/notes.md` | ⬜ |

### Phase 8 — Metadata, SEO & Assets (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Metadata API — static metadata export | `notes/phase-08-metadata-seo-assets/01-static-metadata/notes.md` | ⬜ |
| 2 | `generateMetadata` — dynamic, data-driven metadata | `notes/phase-08-metadata-seo-assets/02-generate-metadata/notes.md` | ⬜ |
| 3 | Metadata inheritance & overriding across layouts | `notes/phase-08-metadata-seo-assets/03-metadata-inheritance/notes.md` | ⬜ |
| 4 | `sitemap.ts` & `robots.ts` generation | `notes/phase-08-metadata-seo-assets/04-sitemap-robots/notes.md` | ⬜ |
| 5 | Open Graph / Twitter images with `next/og` (`ImageResponse`) | `notes/phase-08-metadata-seo-assets/05-og-images-next-og/notes.md` | ⬜ |
| 6 | `next/image` deep dive (optimization, `sizes`, `priority`, remote patterns) | `notes/phase-08-metadata-seo-assets/06-next-image-deep-dive/notes.md` | ⬜ |
| 7 | `next/font` (self-hosting, layout shift prevention) | `notes/phase-08-metadata-seo-assets/07-next-font/notes.md` | ⬜ |
| 8 | Favicons & app icon conventions | `notes/phase-08-metadata-seo-assets/08-favicons-app-icons/notes.md` | ⬜ |

### Phase 9 — Styling in Next.js (6 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | CSS Modules in Next.js | `notes/phase-09-styling/01-css-modules/notes.md` | ⬜ |
| 2 | Global styles & the root layout | `notes/phase-09-styling/02-global-styles-root-layout/notes.md` | ⬜ |
| 3 | Tailwind CSS integration | `notes/phase-09-styling/03-tailwind-integration/notes.md` | ⬜ |
| 4 | CSS-in-JS libraries & the RSC boundary problem | `notes/phase-09-styling/04-css-in-js-rsc-boundary/notes.md` | ⬜ |
| 5 | Sass/PostCSS support | `notes/phase-09-styling/05-sass-postcss/notes.md` | ⬜ |
| 6 | Choosing a styling strategy (senior architecture discussion) | `notes/phase-09-styling/06-choosing-a-styling-strategy/notes.md` | ⬜ |

### Phase 10 — Authentication & Authorization (7 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Session vs JWT strategies in Next.js | `notes/phase-10-auth/01-session-vs-jwt/notes.md` | ⬜ |
| 2 | Auth.js (NextAuth) fundamentals in the App Router | `notes/phase-10-auth/02-authjs-fundamentals/notes.md` | ⬜ |
| 3 | Protecting routes: middleware vs layout vs page-level checks | `notes/phase-10-auth/03-protecting-routes-strategies/notes.md` | ⬜ |
| 4 | Reading/writing cookies (`next/headers` `cookies()`) | `notes/phase-10-auth/04-cookies-api/notes.md` | ⬜ |
| 5 | Server-side session validation in Server Components | `notes/phase-10-auth/05-server-side-session-validation/notes.md` | ⬜ |
| 6 | Role-based access control patterns | `notes/phase-10-auth/06-role-based-access-control/notes.md` | ⬜ |
| 7 | Common auth pitfalls (open redirects, token exposure to client) | `notes/phase-10-auth/07-common-auth-pitfalls/notes.md` | ⬜ |

### Phase 11 — Performance Optimization (10 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Partial Prerendering (PPR) — what it is & why it exists | `notes/phase-11-performance/01-partial-prerendering/notes.md` | ⬜ |
| 2 | Streaming SSR & Suspense granularity strategy | `notes/phase-11-performance/02-streaming-granularity-strategy/notes.md` | ⬜ |
| 3 | `next/dynamic` & code splitting in Next.js | `notes/phase-11-performance/03-next-dynamic-code-splitting/notes.md` | ⬜ |
| 4 | Bundle analysis (`@next/bundle-analyzer`) | `notes/phase-11-performance/04-bundle-analysis/notes.md` | ⬜ |
| 5 | Font/image optimization impact on Core Web Vitals | `notes/phase-11-performance/05-font-image-web-vitals/notes.md` | ⬜ |
| 6 | `next/script` strategies (`beforeInteractive`/`afterInteractive`/`lazyOnload`) | `notes/phase-11-performance/06-next-script-strategies/notes.md` | ⬜ |
| 7 | Prefetching behavior of `next/link` | `notes/phase-11-performance/07-link-prefetching-behavior/notes.md` | ⬜ |
| 8 | Reducing client JS — server-first architecture decisions | `notes/phase-11-performance/08-reducing-client-js/notes.md` | ⬜ |
| 9 | Measuring with Web Vitals reporting / Speed Insights | `notes/phase-11-performance/09-measuring-web-vitals/notes.md` | ⬜ |
| 10 | Common Next.js performance interview scenarios | `notes/phase-11-performance/10-performance-interview-scenarios/notes.md` | ⬜ |

### Phase 12 — Backend Integration & Data Layer (7 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Connecting to a database from Server Components/Actions | `notes/phase-12-backend-integration/01-database-from-server-components/notes.md` | ⬜ |
| 2 | ORMs in Next.js (Prisma/Drizzle) & edge compatibility | `notes/phase-12-backend-integration/02-orms-edge-compatibility/notes.md` | ⬜ |
| 3 | Environment-specific config (server-only secrets) | `notes/phase-12-backend-integration/03-server-only-secrets/notes.md` | ⬜ |
| 4 | Calling REST APIs vs GraphQL from Next.js | `notes/phase-12-backend-integration/04-rest-vs-graphql/notes.md` | ⬜ |
| 5 | Caching external API responses (fetch cache vs custom cache) | `notes/phase-12-backend-integration/05-caching-external-apis/notes.md` | ⬜ |
| 6 | File uploads & multipart data in Route Handlers | `notes/phase-12-backend-integration/06-file-uploads/notes.md` | ⬜ |
| 7 | Background/long-running work limits in serverless/edge | `notes/phase-12-backend-integration/07-background-work-limits/notes.md` | ⬜ |

### Phase 13 — Testing Next.js Apps (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Unit testing Server Components (constraints & strategies) | `notes/phase-13-testing/01-testing-server-components/notes.md` | ⬜ |
| 2 | Testing Client Components (RTL + Next mocks) | `notes/phase-13-testing/02-testing-client-components/notes.md` | ⬜ |
| 3 | Mocking `next/navigation`, `next/headers`, `next/image` | `notes/phase-13-testing/03-mocking-next-modules/notes.md` | ⬜ |
| 4 | Testing Server Actions | `notes/phase-13-testing/04-testing-server-actions/notes.md` | ⬜ |
| 5 | Testing Route Handlers | `notes/phase-13-testing/05-testing-route-handlers/notes.md` | ⬜ |
| 6 | Testing Middleware | `notes/phase-13-testing/06-testing-middleware/notes.md` | ⬜ |
| 7 | E2E testing App Router flows with Playwright | `notes/phase-13-testing/07-e2e-playwright-app-router/notes.md` | ⬜ |
| 8 | Visual regression / snapshot considerations for Next apps | `notes/phase-13-testing/08-visual-regression/notes.md` | ⬜ |

### Phase 14 — Deployment, Config & Monorepo (9 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Deploying to Vercel — what happens under the hood | `notes/phase-14-deployment-config/01-deploying-to-vercel/notes.md` | ⬜ |
| 2 | Self-hosting Next.js (`output: 'standalone'`, Docker) | `notes/phase-14-deployment-config/02-self-hosting-standalone-docker/notes.md` | ⬜ |
| 3 | `next.config.ts` deep dive (redirects, rewrites, headers, images) | `notes/phase-14-deployment-config/03-next-config-deep-dive/notes.md` | ⬜ |
| 4 | Internationalization (i18n) routing strategies | `notes/phase-14-deployment-config/04-i18n-routing/notes.md` | ⬜ |
| 5 | Turbopack vs Webpack in Next.js | `notes/phase-14-deployment-config/05-turbopack-vs-webpack/notes.md` | ⬜ |
| 6 | Monorepo setups (Turborepo) with a Next.js app | `notes/phase-14-deployment-config/06-monorepo-turborepo/notes.md` | ⬜ |
| 7 | CI/CD considerations for Next.js apps | `notes/phase-14-deployment-config/07-ci-cd-considerations/notes.md` | ⬜ |
| 8 | Preview deployments & environment strategy | `notes/phase-14-deployment-config/08-preview-deployments/notes.md` | ⬜ |
| 9 | Observability & error tracking in production | `notes/phase-14-deployment-config/09-observability-error-tracking/notes.md` | ⬜ |

### Phase 15 — Pages Router, Migration & Framework Comparison (7 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Pages Router essentials refresher (`getStaticProps`/`getServerSideProps`/`getInitialProps`) | `notes/phase-15-migration-comparison/01-pages-router-refresher/notes.md` | ⬜ |
| 2 | Pages Router API routes | `notes/phase-15-migration-comparison/02-pages-router-api-routes/notes.md` | ⬜ |
| 3 | Incremental migration: Pages Router → App Router | `notes/phase-15-migration-comparison/03-incremental-migration/notes.md` | ⬜ |
| 4 | When App Router still doesn't fit (real tradeoffs) | `notes/phase-15-migration-comparison/04-when-app-router-doesnt-fit/notes.md` | ⬜ |
| 5 | Next.js vs Remix vs plain Vite+React — the senior "why this framework" answer | `notes/phase-15-migration-comparison/05-nextjs-vs-remix-vs-vite/notes.md` | ⬜ |
| 6 | Next.js vs Astro/other RSC-adjacent frameworks (awareness level) | `notes/phase-15-migration-comparison/06-nextjs-vs-astro-others/notes.md` | ⬜ |
| 7 | Architecture decision framework for choosing Next.js on a new project | `notes/phase-15-migration-comparison/07-architecture-decision-framework/notes.md` | ⬜ |

### Phase 16 — Live Coding / Build Rounds (12 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Build a blog with ISR (markdown/CMS-backed) | `notes/phase-16-live-coding/01-blog-with-isr/notes.md` | ⬜ |
| 2 | Build a paginated/streamed product listing page | `notes/phase-16-live-coding/02-paginated-streamed-listing/notes.md` | ⬜ |
| 3 | Build an authenticated dashboard with protected routes | `notes/phase-16-live-coding/03-authenticated-dashboard/notes.md` | ⬜ |
| 4 | Build a multi-step checkout with Server Actions | `notes/phase-16-live-coding/04-multistep-checkout/notes.md` | ⬜ |
| 5 | Build a search page with URL state + Suspense streaming | `notes/phase-16-live-coding/05-search-with-url-state/notes.md` | ⬜ |
| 6 | Build a rate-limited API route (middleware) | `notes/phase-16-live-coding/06-rate-limited-api-route/notes.md` | ⬜ |
| 7 | Build an image gallery with `next/image` + dynamic OG images | `notes/phase-16-live-coding/07-image-gallery-og-images/notes.md` | ⬜ |
| 8 | Build a comments system with `useOptimistic` | `notes/phase-16-live-coding/08-optimistic-comments/notes.md` | ⬜ |
| 9 | Build a multi-tenant routing structure (parallel/intercepting routes) | `notes/phase-16-live-coding/09-multitenant-routing/notes.md` | ⬜ |
| 10 | Build a file upload flow via Route Handler | `notes/phase-16-live-coding/10-file-upload-flow/notes.md` | ⬜ |
| 11 | Debug a hydration mismatch (live debugging scenario) | `notes/phase-16-live-coding/11-debug-hydration-mismatch/notes.md` | ⬜ |
| 12 | Debug a stale-cache bug (revalidation scenario) | `notes/phase-16-live-coding/12-debug-stale-cache-bug/notes.md` | ⬜ |

---

## How to Update This File

After each topic is completed:
1. Change its status from ⬜ to ✅ in the progress tracker above
2. Move the 👉 **Next** marker to the following topic
3. Commit: `git add CONTEXT.md && git commit -m "Update progress: [topic name] done"`
