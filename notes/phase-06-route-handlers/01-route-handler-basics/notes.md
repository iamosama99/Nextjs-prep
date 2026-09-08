# Route Handler Basics (`route.ts`, `GET`/`POST`/etc.)

**Demo:** `app/playground/phase-06-route-handlers/01-route-handler-basics/api/` — four `route.ts` files, meant
to be hit directly rather than clicked. Run `npm run dev`, then `curl` the paths below. Every claim here —
the 405, the auto-`OPTIONS`, and all three caching classifications — was verified against a real running
server and a real `npm run build`, not assumed from docs.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A `route.ts` file exporting `GET`, `POST`, etc. | A custom request handler for that exact route segment, using the Web `Request`/`Response` APIs | No React involved — this is a plain server endpoint, not a component |
| A method you didn't export (e.g. `PUT`) | Automatically answered with a real `405 Method Not Allowed` | Verified: no code needed to reject unsupported methods yourself |
| No `OPTIONS` export | Next.js auto-implements it, with an `Allow` header listing your real methods | Verified: `allow: GET, HEAD, OPTIONS, POST` for a file exporting only `GET`/`POST` |
| `route.ts` in the same segment as `page.tsx` | A build-time conflict, not a runtime one | They can't coexist — each takes over all HTTP verbs for that segment |

## Where Does This Run?

Entirely server-side, per request — a Route Handler has no client-side counterpart and renders no UI. Under Cache Components (enabled in this project since Phase 3), a `GET` handler follows the exact same static/dynamic/runtime-data classification as a UI route: it can be prerendered once at build time, forced fully dynamic by a non-deterministic call or a runtime API, or included in a static response via `"use cache"`.

## What Is This?

A Route Handler is a file — `route.ts` (or `route.js`) — that exports one function per HTTP method it supports, each receiving a standard Web `Request` and returning a standard Web `Response`. It's the App Router's direct analog to Pages Router API Routes, and Next.js is explicit that you don't combine the two conventions in one project — Route Handlers fully replace that older pattern in the App Router.

```ts
export async function GET() {
  return Response.json({ message: 'Hello World' })
}
```

Supported exports are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS` — nothing more, nothing framework-specific about the function signature itself beyond the file convention that wires it up.

> **Check yourself:** If a `route.ts` file exports only `GET`, what happens — concretely, what status code — when a client sends a `DELETE` request to that route?

## Why Does It Exist?

Server Components (Phase 4) and Server Actions (Phase 5) cover most of an App Router app's server-side needs, but neither is designed to be a **public, framework-agnostic HTTP endpoint** — a webhook target, an RSS feed, a JSON API consumed by a mobile app or a third party, a route that has to return XML or plain text instead of HTML or RSC data. Route Handlers exist specifically for that gap: an endpoint defined with the same file-based routing conventions as the rest of the App Router, but answering in whatever format and protocol shape the caller actually needs, using nothing but the standard Web platform APIs.

## How It Works

### One file, one route segment, every HTTP verb you export

Each exported function name has to match a real HTTP method exactly (`GET`, `POST`, ...). A method you don't export isn't silently ignored — Next.js answers it with a real `405 Method Not Allowed`, verified directly: a file exporting only `GET` and `POST`, hit with a `PUT` request, returns `405` with no handler code written for that rejection at all.

### `OPTIONS` is free unless you override it

If you don't export `OPTIONS` yourself, Next.js auto-implements it and sets a correct `Allow` header listing exactly the methods you did export (plus `HEAD`, which comes free alongside `GET`, and `OPTIONS` itself). Verified against this topic's demo: a file exporting `GET` and `POST` answers a real `OPTIONS` request with `allow: GET, HEAD, OPTIONS, POST` — no code written for it.

### `route.ts` and `page.tsx` cannot share a segment

Each `route.js`/`page.js` file "takes over all HTTP verbs for that route" — you cannot have both at the same exact segment. `app/page.tsx` and `app/api/route.ts` coexist fine (different segments); `app/route.ts` alongside `app/page.tsx` in the same folder is a build-time conflict. This is why every demo in this topic (and this phase) nests its Route Handlers under their own `api/...` subpath, separate from the topic's explanatory `page.tsx`.

### Caching under Cache Components — the same three-way split as a UI route

This project has `cacheComponents: true` set (Phase 3), and `GET` Route Handlers follow the identical model as any other route under it, verified for all three cases against a real `npm run build`:

- **No uncached or runtime data** → prerendered once at build time. [`static-example/route.ts`](../../../app/playground/phase-06-route-handlers/01-route-handler-basics/api/static-example/route.ts) returns a fixed object and classifies `○` in the build's route table, identical to a static UI route.
- **A non-deterministic call** (`Math.random()`) → prerendering stops there and defers to request time. [`dynamic-example/route.ts`](../../../app/playground/phase-06-route-handlers/01-route-handler-basics/api/dynamic-example/route.ts) classifies `ƒ`, and two consecutive requests genuinely return different values (verified: `0.341...` then `0.193...`).
- **A runtime API** (`headers()`, `cookies()`, `connection()`) → same effect, same reason a UI route reading a runtime API goes dynamic (Phase 3 Topic 2). [`runtime-example/route.ts`](../../../app/playground/phase-06-route-handlers/01-route-handler-basics/api/runtime-example/route.ts) classifies `ƒ` and correctly echoes back whatever `User-Agent` header the actual request carried.

`"use cache"` can still be used to include otherwise-uncached data (a database query, say) in a prerendered `GET` response — but the docs note it can't be applied directly inside the Route Handler's own function body; it has to be extracted into a helper function the handler calls, exactly the pattern Phase 3's `"use cache"` topics already established for UI code.

### `POST`, `PUT`, `PATCH`, and `DELETE` are never cached

Unlike `GET`, none of the other HTTP methods are cacheable, even when defined alongside a cached `GET` in the same file — this isn't a Cache Components-specific rule, it applies regardless. It makes sense given what those methods are for: caching a response to a mutation would mean silently replaying stale side effects instead of running them.

## Gotchas

- **A `route.ts` at the same segment as a `page.tsx` is a real conflict, not a warning** — resolved by nesting the Route Handler under its own subpath (this topic's `api/` convention).
- **`GET` is the only cacheable method.** Reaching for `POST` because "this data doesn't change often" gets you an uncached endpoint regardless of how the route is otherwise configured.
- **`"use cache"` can't sit directly in a Route Handler's exported function** — it has to be pulled into a separate helper the handler awaits, same restriction Phase 3 already covers for other contexts.
- **Prerendering "stops" the moment a `GET` handler touches a non-deterministic call or a runtime API** — there's no partial version of this for a Route Handler the way Partial Prerendering gives a UI route a static shell plus a dynamic hole; a Route Handler's response is either fully prerenderable or fully dynamic, since there's no HTML shell to stream around.

## Interview Questions

**Q (High): A `route.ts` file exports only `GET`. What happens when a client sends a `POST` request to that route, and did the developer have to write any code to produce that behavior?**

Answer: Next.js returns a real `405 Method Not Allowed` response automatically — no code required. The framework infers supported methods directly from which function names are exported and rejects anything else on its own.

The trap: assuming unsupported methods either silently succeed (falling through to some default) or need manual rejection logic (`if (request.method !== 'GET') return new Response(null, { status: 405 })`) written by the developer.

**Q (High): Under Cache Components, what determines whether a `GET` Route Handler is prerendered at build time versus rendered fresh on every request?**

Answer: Exactly the same three-way classification as a UI route — a handler that touches no uncached or runtime data prerenders once at build time; one that calls a non-deterministic operation (`Math.random()`, `crypto.randomUUID()`) or a runtime API (`headers()`, `cookies()`, `connection()`) is forced fully dynamic. `"use cache"` (in an extracted helper function, not the handler body directly) can still include otherwise-uncached data in a prerendered response.

The trap: assuming Route Handlers have their own separate caching model distinct from UI routes, rather than recognizing Cache Components applies one unified model across both.

**Q (Medium): Can `app/route.ts` and `app/page.tsx` coexist in the same folder?**

Answer: No — each `route.js`/`page.js` file takes over all HTTP verbs for its exact route segment, and having both at the same segment is a build-time conflict. `app/api/route.ts` alongside `app/page.tsx` is fine because they're different segments (`/` vs. `/api`); the conflict is specifically about sharing one segment, not about a Route Handler existing anywhere near a page.

The trap: thinking the restriction is "you can't use Route Handlers and pages in the same project" rather than the much narrower "not at the exact same segment."

**Q (Medium): If a `GET` Route Handler and a `POST` handler are both defined in the same `route.ts` file, and the `GET` handler is cacheable under the current configuration, is the `POST` handler also cached?**

Answer: No. Only `GET` is ever cacheable — every other method (`POST`, `PUT`, `PATCH`, `DELETE`) is never cached, regardless of what's configured for `GET` in the same file. This is independent of the Cache Components question; it applies in both caching models.

The trap: assuming a file-level caching configuration applies uniformly to every exported method in that file, rather than being scoped specifically to `GET`.

**Q (Low): What Pages Router convention do Route Handlers replace, and does Next.js recommend using both in the same project?**

Answer: API Routes (`pages/api/*.ts`). The docs are explicit that you do not need to use API Routes and Route Handlers together — Route Handlers are the App Router's complete replacement for that pattern, not a supplement to it.

The trap: assuming both conventions are meant to be mixed within one project, e.g., keeping existing `pages/api` routes while adding new `app/**/route.ts` ones as if that were the recommended migration path, rather than the incidental fact that both happen to still work if a project has legacy Pages Router files.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state what happens (status code, and whether code is required) for an unsupported HTTP method
- [ ] Can explain the auto-`OPTIONS` behavior and what its `Allow` header reflects
- [ ] Can explain why `route.ts` and `page.tsx` can't share a segment, precisely (same segment, not same project)
- [ ] Can name all three Cache-Components classifications for a `GET` handler and give an example trigger for each
- [ ] Knows only `GET` is ever cacheable, regardless of file-level configuration

---
*Next: `NextRequest` / `NextResponse` — this topic used the plain Web `Request`/`Response` APIs throughout; the next one covers what Next.js's extended versions add on top, and when reaching for the extended version actually buys you something.*
