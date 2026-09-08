# Reading Search Params, Headers & Cookies in Handlers

**Demo:** `app/playground/phase-06-route-handlers/04-reading-request-data/api/` — run `npm run dev`, then
`curl` each path. Verified end-to-end: every redundant reading style returns identical data for the same
request, and `cookies()` from `next/headers` was confirmed to genuinely write a `Set-Cookie` header inside
a Route Handler — something it cannot do inside a Server Component.

## Quick Reference

| Data | "Next.js runtime API" style | "On the request object" style | Redundant? |
|---|---|---|---|
| Search params | `request.nextUrl.searchParams` | `new URL(request.url).searchParams` | Yes — same data, `nextUrl` just saves the manual `new URL(...)` |
| Headers | `(await headers())` from `next/headers` | `request.headers` | Yes for reading — both read-only here |
| Cookies (read) | `(await cookies())` from `next/headers` | `request.cookies` | Yes for reading |
| Cookies (write) | `(await cookies()).set(...)` — **works here** | `response.cookies.set(...)` (Topic 2) | Two genuinely different write paths, both valid |

## Where Does This Run?

Server-side, per request, same as every Route Handler topic so far. What's specific to this topic is that a Route Handler is one of the few places in the App Router where **both** styles of reading this data — the `next/headers` runtime functions and the request object's own properties — are simultaneously available and point at the same underlying data.

## What Is This?

A Server Component can call `headers()` and `cookies()` from `next/headers` but has no `request` object to read from directly — there simply isn't one in that rendering context. A Route Handler is different: it receives a real `NextRequest` *and* still has access to the exact same `next/headers` functions used throughout Server Components, Server Actions, and Route Handlers alike. This topic is about that overlap — verifying it's genuinely redundant for reading, and finding the one place it isn't: writing cookies.

> **Check yourself:** In a Server Component, is `cookies()` from `next/headers` read-only or read-write? Is the answer the same inside a Route Handler?

## Why Does It Exist?

`next/headers`' functions exist to give the same API surface to every server-side context that might need this data — Server Components, Server Actions, Route Handlers — regardless of whether that context happens to have a `request` object handy (a Server Component doesn't). A Route Handler *does* have a request object, inherited from the standard Web `Request`/`NextRequest` it's built on, so it ends up with both APIs available at once — not because Next.js wanted two ways to do the same thing, but because the request-object API is a property of the platform request itself, while `next/headers` is a Next.js-provided convenience layered on top for contexts that don't have that object.

## How It Works

### Reading is genuinely redundant — verified

[`compare/route.ts`](../../../app/playground/phase-06-route-handlers/04-reading-request-data/api/compare/route.ts) reads the same search param, header, and cookie both ways in a single request, and returns all of them together. A single `curl` with a query string, a custom header, and a cookie confirms every pair agrees exactly: `viaNextUrl` and `viaManualUrl` both resolve to `"hello"`; `viaNextHeaders` and `viaRequestHeaders` both resolve to `"hi"`; `viaNextCookiesRead` and `viaRequestCookies` both resolve to `"cookie-value"`. There's no hidden difference in what data either style sees — the choice between them, for reading, is purely a style preference (or, per Topic 2, whether the surrounding code needs to work outside a Route Handler at all, where only the `next/headers` versions apply).

### Writing is where the two styles genuinely diverge — verified

Headers are read-only no matter which API reads them, in a Route Handler — to send new headers back, you build a `Response`/`NextResponse` carrying them (Topic 2), full stop, whether you got the original value from `headers()` or `request.headers`.

Cookies are different, and this is the one place this topic's comparison isn't purely cosmetic: `cookies()` from `next/headers` is read-only when called in a Server Component — there's no response lifecycle for it to attach a `Set-Cookie` header to during HTML rendering. Inside a Route Handler (or a Server Action, Phase 5), the same `cookies()` function is genuinely read **and write**, because a Route Handler produces a real HTTP response `cookies().set()` can mutate. [`set-via-next-headers/route.ts`](../../../app/playground/phase-06-route-handlers/04-reading-request-data/api/set-via-next-headers/route.ts) confirms this directly: calling `(await cookies()).set('via_next_headers', 'yes')` — with no `NextResponse` or `response.cookies` involved anywhere in the file — still produces a real `set-cookie: via_next_headers=yes; Path=/` header on the actual HTTP response. This is a genuinely different write path from Topic 2's `response.cookies.set(...)`, both valid, neither one "the" way to do it.

## Gotchas

- **The overlap only exists because a Route Handler happens to have both a request object and access to `next/headers`.** A Server Component has only the latter (no request object at all); this topic's redundancy is specific to Route Handlers (and Server Actions, for the write side), not a general App Router fact.
- **`headers()` is read-only everywhere, including in a Route Handler** — only `cookies()` gets the read-write upgrade in a context with a real response lifecycle. Assuming the same upgrade applies to headers is an easy, incorrect generalization.
- **Two write paths for cookies exist in a Route Handler** — `cookies()` from `next/headers` and `response.cookies` on a `NextResponse` you construct yourself. Both produce a real `Set-Cookie` header; picking one is a style choice, not a correctness one, but mixing both for the *same* cookie in the same handler invites confusion about which write actually took effect.

## Interview Questions

**Q (High): Is `cookies()` from `next/headers` read-only or read-write inside a Route Handler? Is the answer the same inside a Server Component?**

Answer: Read-write inside a Route Handler — verified directly, `cookies().set(...)` produces a real `Set-Cookie` header on the response with no `NextResponse` involved. Inside a Server Component, it's read-only, because there's no response lifecycle during HTML rendering for a cookie mutation to attach to. The same function behaves differently depending on which server-side context it's called from.

The trap: assuming `cookies()` has one fixed capability set regardless of context, rather than recognizing its read/write behavior depends on whether the calling context has a real response to mutate.

**Q (High): In a Route Handler, are `request.nextUrl.searchParams` and `new URL(request.url).searchParams` reading different data, or the same data two ways?**

Answer: The same data, verified directly — both resolve to identical values for the same request. `request.nextUrl` is purely a convenience: a pre-parsed `URL` Next.js already built for you, saving the manual `new URL(request.url)` construction. There's no functional difference in what either exposes for search params.

The trap: assuming `nextUrl` applies some Next.js-specific transformation to search params that a manually constructed `URL` wouldn't have — it doesn't; it's the identical parse, done for you.

**Q (Medium): Why does a Route Handler have access to both `headers()`/`cookies()` from `next/headers` and `request.headers`/`request.cookies`, when a Server Component only has the former?**

Answer: A Route Handler is built directly on the Web `Request`/`NextRequest` object, which carries `headers` and `cookies` as its own native properties — that's the platform-level API, always available wherever a request object exists. `next/headers`' functions exist as a Next.js-provided convenience specifically for contexts (like Server Components) that don't have a request object to read from at all. A Route Handler ends up with both simply because it has a request object AND still has access to the shared `next/headers` functions.

The trap: describing the overlap as an intentional "two ways to do the same thing" API design choice, rather than the more precise explanation — one is the platform-native request API, the other is a Next.js convenience layered on for contexts that lack it.

**Q (Medium): Two write paths exist for setting a cookie in a Route Handler — `cookies().set(...)` from `next/headers` and `response.cookies.set(...)` on a `NextResponse`. Do they produce different results?**

Answer: No — both produce a genuine `Set-Cookie` header on the actual HTTP response; they're two different code paths to the same effect, not two mechanisms with different capabilities. Which one to use is a style/context choice (e.g., whether you're already holding a constructed `NextResponse` you want to attach the cookie to, versus wanting to set it before deciding what response shape to return).

The trap: assuming one is "more correct" or has broader capability than the other, rather than recognizing they're equally valid, functionally equivalent write paths.

**Q (Low): Is `headers()` from `next/headers` ever write-capable in any server-side context, the way `cookies()` sometimes is?**

Answer: No — `headers()` is read-only everywhere it's available, including in a Route Handler or Server Action. Setting response headers always requires constructing a new `Response`/`NextResponse` carrying them; there's no `headers().set(...)` mutation path the way there is for cookies in a context with a real response lifecycle.

The trap: generalizing from `cookies()`'s context-dependent read/write behavior to assume `headers()` works the same way — it doesn't; the two APIs aren't symmetric in this respect.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state whether `cookies()` is read-only or read-write in a Route Handler, and why that differs from a Server Component
- [ ] Can explain that `request.nextUrl` and a manually constructed `URL` read identical search param data
- [ ] Can explain *why* the read-two-ways overlap exists (request object + shared next/headers functions), not just that it does
- [ ] Can name both cookie-write paths in a Route Handler and confirm neither is "more correct"
- [ ] Knows `headers()` is read-only in every context, unlike `cookies()`

---
*Next: Streaming responses from a Route Handler — every response so far in this phase has been a single, complete payload; the next topic covers building one incrementally with a `ReadableStream`, and why `curl` alone can't reliably prove it's actually streaming.*
