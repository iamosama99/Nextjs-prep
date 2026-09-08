# Route Handlers vs Server Actions — When to Use Which

**Demo:** None — this topic is a decision framework, not new runtime behavior. Every mechanism it compares
has already been demonstrated live: Route Handlers across this phase's Topics 1–6, Server Actions across
Phase 5's Topics 1–8.

## Quick Reference

| | Route Handlers (Phase 6) | Server Actions (Phase 5) |
|---|---|---|
| Reachable by | Anyone with the URL — any HTTP client, any origin (with CORS) | Only your own app's compiled action reference (Topic 1) |
| HTTP methods | Any — `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc. | `POST` only, always |
| Content type | Anything — JSON, XML, plain text, images, streams | Serialized RSC-flavored data only |
| Client dispatch | Independent, parallel-capable requests | Sequential, queued one at a time per client (Phase 5 Topic 1) |
| Progressive enhancement | None built in — you'd hand-roll a `<form>` posting to the URL | Automatic, verified directly (Phase 5 Topic 8) |
| Typical caller | A browser tab, a mobile app, curl, a third-party server (webhook) | This app's own rendered UI |
| Cacheable | `GET` only, opt-in (Topic 1) | Never — actions are mutations by convention |

## Where Does This Run?

Both run exclusively server-side — this comparison is about the *shape of the entry point*, not where the code executes.

## What Is This?

Both mechanisms let client-triggered code run on the server, and on the surface they can look interchangeable — either one can read a database, validate input, and write a response. The actual decision isn't "which is more powerful" (they're both fully capable), it's about what kind of thing is calling, and what kind of response format the interaction needs.

> **Check yourself:** Could a Server Action be called directly from a mobile app's native HTTP client, the same way a Route Handler can?

## Why Does It Exist?

Next.js didn't build two mechanisms doing the same job — Route Handlers predate Server Actions by several versions and solve the general "public HTTP endpoint" problem any backend needs. Server Actions arrived later specifically to solve a narrower, React-shaped problem: calling server-side mutation logic *from inside a component's own render*, with the ergonomics of a function call rather than hand-writing a `fetch` to an endpoint. They overlap in capability but were designed for genuinely different callers.

## The Decision Framework

### Reach for a Route Handler when the caller isn't your own React tree

A webhook from a payment processor or CMS (Phase 6 Topic 6), a mobile app's API client, a public JSON/RSS/XML feed (Topic 1), an OAuth callback URL, anything a `curl` command or a non-Next.js service needs to hit directly — none of these have a Server Action reference to call, because that reference only exists inside your own compiled client bundle (Phase 5 Topic 1). A Route Handler is a plain URL; anything that can make an HTTP request can call it.

### Reach for a Server Action when the caller is a component in your own app, performing a mutation

A form submission, a button click that updates data, anything wired to `<form action={fn}>` or an event handler within your own rendered UI. This is where Server Actions' whole ergonomic case lives: the RPC wiring is generated for you (Phase 5 Topic 1), the response can bundle a fresh re-render of the current route in the same round trip (Phase 5 Topic 1's single-response model), and — verified directly — the exact same code gets progressive enhancement for free (Phase 5 Topic 8), none of which a hand-written `fetch` to a Route Handler gets automatically.

### Data fetching: Server Actions are the wrong tool, verified by their own dispatch model

This is the sharpest, most concrete distinguishing fact, and it's not a style preference: Server Actions are dispatched **sequentially, one at a time, per client** (Phase 5 Topic 1's research, straight from the docs) — a real, deliberate constraint of how Next.js queues them, not an implementation detail that might change casually. Firing off several Server Actions to fetch unrelated pieces of data forces them to run one after another, exactly the sequential-waterfall problem Phase 4 Topic 5 already covered avoiding for Server Component data fetching. Route Handlers carry no such constraint — separate requests to separate (or even the same) Route Handler run independently and can be issued in parallel by the client. Server Components fetching data directly (Phase 4) remain the default choice for a page's own data; Route Handlers are the right escape hatch when data genuinely needs to be fetched from outside a React render at all (client-side polling, a third-party consumer).

### Caching: only one of the two is ever cacheable

A `GET` Route Handler can be cached — statically prerendered under Cache Components, or opted into the previous model's `force-static` (Topic 1). A Server Action is never cached; it's a mutation by convention (Phase 5 Topic 1: "Server Action" specifically means a Server Function used for a mutation), and Next.js's revalidation machinery (Phase 5 Topic 6) exists to invalidate caches *after* a Server Action runs, not to cache the action's own execution.

### Security posture differs in what's actually being defended

Every Server Action is POST-reachable directly regardless of UI (Phase 5 Topics 1 and 7) — the defense is authentication/authorization *inside* the action, since the caller is assumed to be a legitimate (if possibly malicious) user of your own app. A Route Handler is often *meant* to be reachable by anyone (Topic 6's CORS material, the "Backend for Frontend" framing) — its defense is a mix of the same auth/authz discipline plus explicit, deliberate decisions about who's allowed to call it at all (CORS origins, a webhook's shared secret, rate limiting).

## Gotchas

- **"Server Actions are queued" is a documented, deliberate constraint, not a bug to work around with clever batching** — the fix for needing parallel server-triggered work is a Route Handler or parallel Server Component data fetching, not fighting the queue.
- **A Server Action cannot be called from outside your own compiled app** — no mobile client, no third-party service, no `curl` command has access to a valid, non-expired action reference the way it can hit a Route Handler's plain URL.
- **Only `GET` Route Handlers are ever cacheable, and Server Actions never are** — reaching for either mechanism expecting response caching to "just work" for a `POST`/mutation case is a mistake in both directions.
- **Progressive enhancement is a Server Action property, not a general "server code" property** — a Route Handler called via client-side `fetch` gets none of it automatically; replicating it would mean hand-rolling a plain `<form>` posting directly to the Route Handler's URL and handling the full-page response yourself.

## Interview Questions

**Q (High): A page needs to fetch data that will be polled every 5 seconds from the client. Should this be a Server Action or a Route Handler, and why?**

Answer: A Route Handler. Server Actions are dispatched sequentially, one at a time, per client — repeated polling calls would queue behind each other rather than firing independently, and Server Actions are conventionally for mutations, not data fetching, in the first place. A Route Handler has no such queuing constraint and is built for exactly this "public endpoint returning data" shape.

The trap: reaching for a Server Action because "it's already wired into my component" without accounting for its sequential dispatch model, which actively works against a polling use case.

**Q (High): Can a third-party webhook (from Stripe, a CMS, etc.) call a Server Action directly?**

Answer: No. A Server Action is only reachable via its compiled, encrypted action reference (Phase 5 Topic 1), which exists inside your own app's client bundle — an external service has no way to obtain or construct that reference. A webhook needs a plain, stable URL any HTTP client can POST to, which is exactly what a Route Handler provides.

The trap: treating "POST-reachable" (true of both) as equivalent to "callable by anyone with the URL" — Server Actions are POST-reachable but not URL-discoverable/stable the way a Route Handler is.

**Q (Medium): Both a Route Handler and a Server Action can validate input, write to a database, and return a result. If they're both fully capable of the same underlying work, what actually decides which one to use for a given feature?**

Answer: Who's calling it and what response shape is needed — not raw capability. If the caller is a component within your own rendered UI performing a mutation, a Server Action gets automatic progressive enhancement, generated RPC wiring, and a single-round-trip response bundling a fresh re-render. If the caller is external (a third party, a non-React client) or needs an arbitrary content type/HTTP method/caching behavior, a Route Handler is the only option that fits.

The trap: treating this as a matter of developer preference or code organization, rather than recognizing each is genuinely unsuited to the other's core use case (Route Handlers get no automatic progressive enhancement; Server Actions can't be called by external clients).

**Q (Medium): Why is a `GET` Route Handler cacheable but a Server Action never is?**

Answer: A `GET` Route Handler can represent an idempotent read with no side effects — exactly the kind of response safe to cache and serve repeatedly. A Server Action, by definition and convention (Phase 5 Topic 1), represents a mutation — caching a mutation's response would mean silently skipping the actual side effect on a cache hit, which is never correct. The two aren't symmetric in cacheability because they aren't symmetric in what they represent.

The trap: assuming caching is purely a performance knob available to any server-side function, rather than recognizing it's fundamentally incompatible with what a mutation is.

**Q (Low): Does Next.js recommend replacing all Route Handlers with Server Actions now that Server Actions exist, or the reverse?**

Answer: Neither — they coexist for different jobs. Route Handlers remain the correct choice for public APIs, webhooks, non-UI content, and anything called by non-React/non-Next.js clients; Server Actions remain the correct choice for mutations triggered from within the app's own React tree. Neither one obsoletes the other.

The trap: treating the newer mechanism (Server Actions) as a strict upgrade path that should replace the older one (Route Handlers) everywhere, rather than recognizing they were designed for non-overlapping primary use cases despite some capability overlap.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state, without hedging, why Server Actions are the wrong tool for client-side polling
- [ ] Can explain why an external service can never call a Server Action directly
- [ ] Can articulate the actual decision criterion (who's calling, what shape) rather than "whichever is more powerful"
- [ ] Can explain why only GET Route Handlers are cacheable and Server Actions never are
- [ ] Can name at least three concrete scenarios that unambiguously require a Route Handler and three that unambiguously suit a Server Action

---
*This completes Phase 6 — Route Handlers. Phase 7 (Middleware & Edge Runtime) covers the layer that runs before a request reaches either a Route Handler or a page — `proxy.ts` (the current name; `middleware.ts` is deprecated as of Next.js 16), rewrites/redirects/headers from that layer, and the Edge vs. Node.js runtime tradeoff.*
