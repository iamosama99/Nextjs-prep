# `NextRequest` / `NextResponse`

**Demo:** `app/playground/phase-06-route-handlers/02-nextrequest-nextresponse/api/` — run `npm run dev`, then
`curl` each endpoint (see the notes below). Every response, header, and cookie shown here was captured from
a real running server.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `request: NextRequest` instead of `request: Request` | An extension of the Web `Request` API | Unlocks `.nextUrl`, `.cookies` on the request — same underlying request, more convenience |
| `request.nextUrl` | A parsed `URL` with Next.js-specific extras (`pathname`, `searchParams`, `basePath`, `buildId`) | No manual `new URL(request.url)` needed |
| `NextResponse.json(data)` / `NextResponse.redirect(url)` | Convenience constructors over the Web `Response` API | Same effect as building a `Response` by hand, less boilerplate |
| `response.cookies.set(...)` | Writes a real `Set-Cookie` header on the outgoing response | Verified: produces an actual `set-cookie` header a browser or `curl -i` can see |
| `request.cookies.get(...)` | Reads whatever cookie header the incoming request carried | The request-side mirror of the response-side API above |

## Where Does This Run?

Server-side only, exactly like the plain Web APIs they extend (Topic 1) — `NextRequest` and `NextResponse` add convenience methods on top of `Request`/`Response`, not a different execution model.

## What Is This?

Every Route Handler in Topic 1 used the plain Web `Request`/`Response` APIs directly. `NextRequest` and `NextResponse`, both importable from `next/server`, are Next.js's own subclasses of those same Web APIs — everything a plain `Request`/`Response` can do, plus convenience methods Next.js layers on top for things developers do constantly: parsing the URL, reading or writing cookies, building a redirect. You can pass a `NextRequest` anywhere a plain `Request` is expected, and return a `NextResponse` anywhere a plain `Response` is expected — the docs are explicit about this interop, and it follows directly from one being a genuine extension of the other, not a parallel, incompatible type.

```ts
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  return NextResponse.json({ name })
}
```

> **Check yourself:** If a function typed to accept a plain `Request` is called with a `NextRequest` instead, does that work?

## Why Does It Exist?

The plain Web `Request`/`Response` APIs are genuinely sufficient for a Route Handler (Topic 1 used nothing else), but some operations come up often enough, and are annoying enough to do correctly by hand — parsing a URL's search params, constructing a valid redirect `Response` with the right status and `Location` header, building a correctly-formatted `Set-Cookie` header with all its attributes — that Next.js provides typed, tested helpers for them rather than leaving every project to reinvent the same small utilities.

## How It Works

### `nextUrl` — a parsed URL with less boilerplate

`request.nextUrl` is a parsed `URL` object exposing `pathname`, `search`/`searchParams`, and Next.js-specific fields like `basePath` and `buildId`. This topic's demo confirms the shape directly: a request to `.../api/nexturl?name=lee` returns `pathname`, `search: "?name=lee"`, and `searchParams.get('name')` resolving to `"lee"` — everything you'd otherwise get from manually constructing `new URL(request.url)` yourself, already done.

### Cookies live on both sides, doing different jobs

`request.cookies` and `response.cookies` look similar (`get`, `set`, `has`, `getAll`, `delete`) but operate on opposite ends of the exchange. [`cookies/set/route.ts`](../../../app/playground/phase-06-route-handlers/02-nextrequest-nextresponse/api/cookies/set/route.ts) calls `response.cookies.set('demo_pref', 'dark')` on a `NextResponse` — verified to produce a real `set-cookie: demo_pref=dark; Path=/` header on the actual HTTP response. [`cookies/read/route.ts`](../../../app/playground/phase-06-route-handlers/02-nextrequest-nextresponse/api/cookies/read/route.ts) calls `request.cookies.get('demo_pref')` on the incoming `NextRequest` — verified to correctly read back whatever cookie a `curl -b` (or a real browser) actually sent, and to correctly report `null`/`false` when no such cookie was present. Setting on the response and reading from the request are two separate mechanisms, not two views of the same data — this demo verifies both independently.

### `NextResponse.redirect()` builds a real redirect

`NextResponse.redirect(url)` produces a genuine HTTP redirect — verified: a request to [`redirect/route.ts`](../../../app/playground/phase-06-route-handlers/02-nextrequest-nextresponse/api/redirect/route.ts) returns a real `307 Temporary Redirect` with a correct `Location` header, built from a URL constructed off the request's own `nextUrl` rather than a hardcoded string. This is the Route Handler equivalent of `redirect()` from `next/navigation`, which Topic 1's research showed is also usable directly in a Route Handler — `NextResponse.redirect()` is the lower-level, Web-standard-flavored option when you want to build the `Response` yourself rather than let `redirect()` throw its control-flow exception.

### An interesting, verified side effect of "no dynamic data" for cookies

`cookies/set/route.ts` only ever sets the same fixed cookie value — it doesn't read anything from the incoming request. Checked against a real `npm run build`, it classifies `○` (static, prerendered once), the same as any Cache-Components-eligible handler with no uncached or runtime data (Topic 1). `cookies/read/route.ts`, which does read `request.cookies`, classifies `ƒ` (fully dynamic) — reading anything off the incoming request is itself enough to force per-request rendering, the same as reading `headers()` or `cookies()` from `next/headers` would. Worth internalizing: *setting* a fixed cookie doesn't require per-request execution; *reading* anything request-specific does.

### What `NextResponse` does **not** cover in a Route Handler

`NextResponse.next()` and (its rewrite capability aside) some of `NextResponse`'s other helpers exist primarily for `proxy.ts` (formerly `middleware.ts`) — Phase 7 territory. `.next()` specifically has no meaning inside a Route Handler at all; it's how a proxy signals "continue routing normally," a concept that doesn't apply once a Route Handler is already the terminal handler for a request.

## Gotchas

- **`request.cookies` and `response.cookies` are not the same object doing the same job from two angles** — one reads what arrived, the other writes what goes out. Conflating them is an easy mistake given the identical method names.
- **Setting a cookie on the response doesn't automatically make a `GET` handler dynamic** — only reading request-specific data does. A handler that unconditionally sets the same cookie value can still be prerendered once under Cache Components, verified directly in this topic's demo.
- **`NextResponse.next()` has no role inside a Route Handler** — it's a `proxy.ts`-specific signal to continue routing, not a general-purpose Route Handler API, easy to reach for out of habit if `proxy`/middleware code is more familiar.

## Interview Questions

**Q (High): What does `request.nextUrl` give you that `new URL(request.url)` doesn't already provide on a plain Web `Request`?**

Answer: Functionally similar parsed-URL access (`pathname`, `search`, `searchParams`), plus Next.js-specific fields like `basePath` and `buildId` that a plain `URL` construction wouldn't expose at all — `nextUrl` is Next.js's own extension, aware of the framework's own routing concepts, not just a generic URL parser.

The trap: describing `nextUrl` as "just a URL object" without naming the Next.js-specific fields that are the actual reason it exists as a separate API rather than developers just doing `new URL(request.url)` themselves.

**Q (High): Can a plain function typed to accept a Web `Request` be called with a `NextRequest`? Can a function expecting a Web `Response` receive a `NextResponse`?**

Answer: Yes to both — `NextRequest` and `NextResponse` are genuine subclasses/extensions of the Web APIs they're built on, not separate incompatible types. The docs state this interop directly, and it follows from the inheritance relationship: anywhere a `Request` is structurally expected, a `NextRequest` satisfies it, and the same holds for `Response`/`NextResponse`.

The trap: assuming `NextRequest`/`NextResponse` are Next.js-proprietary types requiring conversion before use with any code expecting the standard Web APIs.

**Q (Medium): `request.cookies.get('theme')` and `response.cookies.set('theme', 'dark')` share nearly identical method names. What's actually different about what each one does?**

Answer: `request.cookies` reads from the `Cookie` header the client actually sent on the incoming request — it reflects what already exists. `response.cookies` writes to the `Set-Cookie` header on the outgoing response — it's how the server tells the client to store or update a cookie going forward. They're not two ways of accessing the same state; one is read-only reflection of the past, the other is a write instruction for the future.

The trap: treating the shared method-name vocabulary (`get`, `set`, `has`) as evidence they operate on the same underlying data, rather than recognizing they're mirror-image APIs on opposite ends of the request/response cycle.

**Q (Medium): Under Cache Components, does calling `response.cookies.set(...)` inside a `GET` handler force that handler to be rendered dynamically on every request?**

Answer: No — verified directly. A handler that unconditionally sets a fixed cookie value, without reading anything request-specific, can still be classified as static (`○`) and prerendered once at build time; the identical `Set-Cookie` header is then served on every response. What forces dynamic rendering is reading something request-specific — `request.cookies.get(...)`, `headers()`, `cookies()` from `next/headers`, or a non-deterministic call — not merely writing a static value to the response.

The trap: assuming any cookie-related code automatically opts a route out of static rendering, rather than distinguishing "writing a fixed value" (fine, stays static) from "reading request-specific data" (forces dynamic).

**Q (Low): What is `NextResponse.next()` for, and does it have a meaningful use inside a Route Handler?**

Answer: It's specifically for `proxy.ts` (Phase 7) — it signals "continue routing normally without short-circuiting the request." It has no meaningful role inside a Route Handler, which is already the terminal handler for whatever request reaches it; there's no further routing step for `.next()` to defer to.

The trap: reaching for `.next()` inside a Route Handler out of familiarity with proxy/middleware code, rather than recognizing it belongs to a different part of the request lifecycle entirely.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what `nextUrl` adds over manually parsing `request.url`
- [ ] Can state the interop rule (NextRequest/NextResponse work wherever plain Request/Response are expected) and why it holds
- [ ] Can distinguish `request.cookies` from `response.cookies` by which side of the exchange each belongs to
- [ ] Can explain why setting a fixed cookie doesn't force dynamic rendering but reading request data does
- [ ] Knows `NextResponse.next()` belongs to `proxy.ts`, not Route Handlers

---
*Next: Dynamic route handlers & params — every endpoint in this topic lived at a fixed path; the next one covers `[slug]/route.ts`, the `params` promise, and `generateStaticParams` for Route Handlers.*
