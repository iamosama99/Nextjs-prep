# What Next.js Solves vs a Plain React/Vite SPA

## Quick Reference

| Concern | Vite + React SPA (you build it) | Next.js (you configure it) |
|---|---|---|
| Routing | Add `react-router`, define routes in code | File-based — folder structure *is* the route tree |
| Rendering | Client-only by default; SSR is a manual project | Per-route choice: static, dynamic, streamed — built in |
| Data layer | You write fetch + cache + loading/error states | `fetch` extended with a built-in cache; Server Components fetch inline |
| Initial payload | Empty `<div id="root">`, blank until JS runs | Server-rendered HTML (or static) arrives first |
| Backend for your frontend | Separate Express/Fastify app, or none | Route Handlers + Server Actions live in the same project |

## What Is This?

React is a **UI library** — it renders components into a DOM tree and nothing more. It has no opinion about routing, data fetching, bundling, or how (or where) your code runs. Next.js is a **framework** built on top of React that supplies all of that missing infrastructure with sane, opinionated defaults: file-based routing, a build pipeline, a server runtime, a caching layer, and integrated tooling for images, fonts, and metadata.

Vite, by contrast, is a **build tool and dev server** — excellent at bundling and hot-reloading a client-side app fast, but it renders nothing on a server by default and has no routing convention of its own. A "Vite + React" app is a single-page application: one HTML shell, hydrated entirely on the client.

> **Check yourself:** If someone says "we're using React," what have you actually learned about their rendering strategy, routing, or server setup? (Nothing — that's the point.)

## Why Does It Exist?

Before meta-frameworks, teams that wanted server rendering with React built it themselves: an Express server calling `ReactDOMServer.renderToString`, a manually wired `react-router` config shared between client and server, a hand-rolled code-splitting strategy, and `react-helmet` juggling `<head>` tags for SEO. Every team solved the same problems slightly differently, and most of the subtle bugs — hydration mismatches, duplicated data fetches, waterfalls from fetching only after mount — came from that infrastructure being hand-rolled and under-tested rather than from React itself.

Next.js exists to make that infrastructure a solved problem: routing, rendering strategy, data caching, and the client/server boundary are framework-level concerns with a stable API, so the team's own code only has to deal with product logic. This matters more now than it used to, because React Server Components require a framework that knows how to bundle server-only and client-only code separately, stream a response, and serialize the RSC payload across the network — none of which a plain bundler like Vite does. `React-prep`'s coverage of RSC, Suspense, and streaming SSR describes *what* those mechanisms are; Next.js is currently the primary framework that actually implements the server infrastructure to run them in production.

## How It Works

Next.js is best understood as three things stacked on top of React:

1. **A build system** (Turbopack in dev, Webpack/Turbopack for production builds) that understands the file-based routing convention and produces both a server bundle and a client bundle from the same source tree — splitting server-only code (database calls, secrets) from what actually ships to the browser.
2. **A server runtime** — a Node.js process (or an Edge runtime, see Phase 7) that can render React to HTML/RSC payload on demand, handle Route Handlers, run Middleware, and serve statically-generated pages directly from disk or a CDN.
3. **A convention layer** — the `app/` directory's file names (`page.tsx`, `layout.tsx`, `loading.tsx`, etc., covered in Phase 2) declaratively describe routing, nesting, and loading/error states instead of you wiring them in code.

A Vite + React SPA has none of the last two. Everything is client JavaScript; the "server" is just a static file host (or nothing at all in dev). To add SSR to a Vite app, you'd run Vite in middleware mode inside your own Node server, manually call React's server rendering APIs, and manually reconcile routes between server and client — which is exactly the plumbing Next.js already did.

> **Check yourself:** Why can't Vite alone give you React Server Components? What specific capability is missing — a bundler feature, a server, or both?

## Side-by-Side: What You'd Have to Build Yourself

| Feature | In Next.js | In a bare Vite SPA |
|---|---|---|
| Routing | `app/blog/[slug]/page.tsx` | Install `react-router`, define a route config |
| Server rendering | Automatic per route | Custom Express server + `renderToPipeableStream` |
| Code splitting | Automatic per route segment | Manual `React.lazy` + `Suspense` boundaries |
| SEO meta tags | `generateMetadata` (Phase 8) | `react-helmet` or manual `<head>` manipulation |
| Image optimization | `next/image` (Phase 8) | A separate CDN/image service, wired by hand |
| API endpoints | Route Handlers in the same repo (Phase 6) | A separate backend service |
| Data caching | Built-in Data Cache on `fetch` (Phase 3) | Your own cache (React Query, SWR, or nothing) |

## Gotchas

- **"We use React" tells you nothing about rendering strategy.** Conflating React (the library) with Next.js (a framework choice) is the single most common junior mistake in this space — a senior candidate should immediately separate the two when asked "how does your app render."
- **Next.js is not "always SSR."** It supports static generation, server rendering, streaming, and client-only rendering — the rendering mode is chosen per route (Phase 3), not fixed for the whole app. Assuming everything is server-rendered leads to wrong answers about caching and interactivity.
- **Framework overhead isn't free.** A pure client-side, auth-gated internal dashboard with no SEO requirement often has nothing to gain from Next.js's server infrastructure and can be simpler and cheaper to run as a static Vite SPA on a CDN, with no Node server to operate at all.

## Interview Questions

**Q (High): What is the actual difference between React and Next.js, and why does the distinction matter in an architecture discussion?**

Answer: React is a UI-rendering library with no built-in opinion on routing, data fetching, or server rendering. Next.js is a framework that wraps React and supplies file-based routing, a build pipeline that separates server and client code, a server runtime capable of SSR/SSG/streaming, and integrated tooling (image/font optimization, metadata, middleware). Choosing "React" says nothing about how the app is delivered to the browser; choosing "Next.js" is a decision about the entire delivery pipeline.

The trap: candidates who use the terms interchangeably, or who describe Next.js features ("file-based routing," "getServerSideProps") as if they were React itself. Interviewers use this question to check whether the candidate actually understands the layering.

**Q (High): When would you choose a plain Vite + React SPA over Next.js?**

Answer: When there's no SEO requirement, no need for fast first-paint on cold load (e.g., it's behind auth and users load it once per session), and the team doesn't want to operate or reason about a server runtime — internal tools, admin dashboards, and authenticated single-tenant apps are common cases. A static SPA on a CDN is cheaper to host, has a simpler mental model (no server/client boundary to manage), and avoids the operational surface of a Node server or serverless functions.

The trap: candidates who treat Next.js as a strict upgrade with no downsides. A senior engineer should be able to argue against their own default tool when the requirements don't call for it.

**Q (Medium): Before meta-frameworks like Next.js, what problems did teams run into building SSR React apps by hand?**

Answer: Duplicated or inconsistent routing logic between the Express server and the client-side router; hydration mismatches from subtle differences between server-rendered and client-rendered output; manual, error-prone code-splitting; SEO metadata management via libraries like `react-helmet` that had to be wired into the SSR pass by hand; and no shared caching layer, so the same data often got fetched once on the server and again on the client.

The trap: vague answers like "it was harder." The interviewer wants specific failure modes, because they reveal whether the candidate understands *why* Next.js's abstractions (file conventions, the Data Cache, the RSC payload) exist rather than just knowing the APIs.

**Q (Medium): Is it accurate to say Next.js "adds a backend" to a React app?**

Answer: Partially. It adds a server *runtime* that can execute code (Route Handlers, Server Actions, Middleware), which is backend-like — but it's not a general-purpose backend framework. It's still primarily oriented around rendering your frontend, with request-handling capabilities layered in. Teams often still run a separate dedicated backend/API for core business logic and use Next.js's server capabilities for things tightly coupled to rendering (auth checks, BFF-style data shaping).

The trap: candidates who claim Next.js fully replaces a backend service, or conversely who dismiss its server capabilities entirely as "just for rendering."

**Q (Low): What company created Next.js, and what's the relationship between Next.js and Vercel?**

Answer: Next.js was created by Vercel (then called Zeit). Next.js itself is open source and can be self-hosted or deployed anywhere that runs Node.js (Phase 14 covers this), but Vercel's hosting platform is built to deploy Next.js with zero configuration and is where several Next.js features (like certain caching and Edge behaviors) are most seamlessly supported first.

The trap: assuming Next.js *requires* Vercel to run — it doesn't, though some features have the smoothest experience there.

---

## Self-Assessment

- [ ] Can state in one sentence why "React" and "Next.js" are not interchangeable terms
- [ ] Can name at least four pieces of infrastructure Next.js provides that a Vite SPA does not
- [ ] Can argue a real case for *not* using Next.js on a given project
- [ ] Can explain, without notes, what specifically breaks if you try to build RSC support on top of Vite alone
- [ ] Can describe at least two concrete bugs that were common in hand-rolled SSR React apps before meta-frameworks

---
*Next: `create-next-app` anatomy & project structure — now that you know why the framework exists, see exactly what it scaffolds and why each generated file is there.*
