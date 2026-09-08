# CORS & Webhooks in Route Handlers

**Demo:** `app/playground/phase-06-route-handlers/06-cors-and-webhooks/api/` — run `npm run dev` for the
CORS/payload endpoints, `npm run build && npm run start` for the webhook-revalidation flow (real `"use
cache"` behavior needed, same reason as Phase 3/5). Every claim below — the preflight headers, the token
rejection, and the stale-while-revalidate timing — was verified against a real running server.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `Access-Control-Allow-*` response headers | Plain HTTP headers, set by hand | No CORS-specific Next.js API — it's the same mechanism any backend uses |
| An explicit `OPTIONS` export with CORS headers | A real preflight response | Topic 1's *automatic* `OPTIONS` only sets a plain `Allow` header — not enough for a genuine cross-origin preflight |
| A webhook `GET`/`POST` route checking a shared secret | The entire "authentication" a public, unauthenticated-by-definition endpoint gets | Verified: wrong token → `401`, no revalidation; correct token → `200`, revalidation actually scheduled |
| `revalidateTag(tag, 'max')` triggered from a webhook | Still stale-while-revalidate (Phase 5 Topic 6) | Verified: the very next read after the webhook call still returned the old value; a later one returned the fresh one |

## Where Does This Run?

Server-side, same as every Route Handler in this phase — CORS headers are just response headers set from server code, and a webhook handler is an ordinary Route Handler whose caller happens to be a third-party service instead of this app's own frontend.

## What Is This?

Two distinct, commonly-paired concerns for a "public API" Route Handler (Topic 1's "Backend for Frontend" framing): **CORS** governs whether a *browser*, on a different origin, is allowed to read the response of a cross-origin request it makes. **Webhooks** are the mirror case — a *server-to-server* call from a third party with no browser and no origin-based restriction at all, where the actual security question is "how do I know this request genuinely came from who it claims to."

> **Check yourself:** Does CORS have any bearing on whether a third-party service's server can successfully POST to your webhook endpoint?

## Why Does It Exist?

Browsers block cross-origin reads of a response by default (the Same-Origin Policy) unless the server explicitly opts in via CORS headers — necessary because a Route Handler is a public endpoint (Topic 1's "Backend for Frontend" framing), and without that default block, any website could silently read data from an authenticated user's session against your API from their browser. Webhooks exist for the opposite direction: a Route Handler is often the *only* way for a third-party service (a CMS, a payment processor) with no UI of its own to notify your app that something happened — there's no user-driven request to hang the notification off of, so a plain public endpoint is the natural shape.

## How It Works

### CORS: plain headers, no special Next.js API — and the auto-`OPTIONS` from Topic 1 isn't enough

Setting `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` on a `Response` is standard Web platform behavior, nothing Next.js-specific. What *is* worth knowing precisely: Topic 1's free, automatically-generated `OPTIONS` handler only sets a plain `Allow` header listing supported methods — it has no idea about CORS and sets none of the `Access-Control-*` headers a real browser preflight needs. [`cors/route.ts`](../../../app/playground/phase-06-route-handlers/06-cors-and-webhooks/api/cors/route.ts) defines `OPTIONS` explicitly instead, verified against a real preflight request (an `OPTIONS` call carrying `Origin` and `Access-Control-Request-Method`, exactly what a browser sends before a real cross-origin request): the response correctly includes all three CORS headers, and the subsequent real `GET` carries the same headers on its own response.

### Webhooks: the shared secret *is* the authentication

A webhook endpoint is, by construction, a Route Handler with no session, no logged-in user, nothing resembling the auth patterns from Phase 5 Topic 7 — the caller is a machine, not a person with a browser session. [`webhook-callback/route.ts`](../../../app/playground/phase-06-route-handlers/06-cors-and-webhooks/api/webhook-callback/route.ts) mirrors the docs' revalidate-on-content-change pattern directly: check a shared secret token against the query string before doing anything else. Verified end-to-end: a request with the wrong token gets a real `401` and — confirmed by re-checking the cached content afterward — genuinely does **not** trigger any revalidation; a request with the correct token gets `200` and does trigger `revalidateTag`.

### Receiving an arbitrary payload — the other webhook shape

Not every webhook is a simple `GET` callback with a token — many (Stripe, GitHub) `POST` a JSON body describing what happened. [`webhook-payload/route.ts`](../../../app/playground/phase-06-route-handlers/06-cors-and-webhooks/api/webhook-payload/route.ts) reads the raw body with `request.text()` inside a `try`/`catch`, verified both for a valid payload (parses correctly, echoes back its keys) and an invalid one (a real `400` with a useful message, not an unhandled exception). Unlike Pages Router API Routes, no `bodyParser` configuration is needed for any of this — the Web `Request` body-reading methods (`.text()`, `.json()`, `.formData()`) work directly.

### A webhook-triggered `revalidateTag` is still stale-while-revalidate — verified, not assumed

Calling `revalidateTag('webhook-demo', 'max')` from inside a webhook doesn't change what that call *is* — Phase 5 Topic 6 already established that `revalidateTag` with a profile is stale-while-revalidate, not immediate. This topic re-verified it in a genuinely different scenario: the mutation and the read are now two **entirely separate requests** (the webhook call, then a later, independent `curl` to `/api/content`), rather than sequential steps within one action's own response the way Phase 5 Topic 6 tested it. The result matches the documented model exactly: the very next `/api/content` read immediately after the webhook call still returned the **old**, pre-revalidation content; a read a couple of seconds later returned the fresh value. This is the "textbook" stale-while-revalidate case Phase 5 Topic 6 predicted but couldn't cleanly demonstrate itself (its own no-JS-fallback test happened to make the mutation and the read part of one unified request/response).

## Gotchas

- **The automatically-generated `OPTIONS` handler (Topic 1) is not a CORS preflight response.** It sets a plain `Allow` header, nothing `Access-Control-*` — a route relying on it alone will fail a real cross-origin preflight silently from the browser's perspective (a network-level rejection the Route Handler itself never even sees).
- **CORS has nothing to do with server-to-server webhook calls.** CORS is a *browser* enforcement mechanism; a third-party server calling your webhook endpoint isn't a browser and isn't subject to it at all — the actual security concern there is verifying the caller's identity (a shared secret, a signature), not CORS headers.
- **`Access-Control-Allow-Origin: '*'` disables a meaningful security boundary for any endpoint that reflects authenticated/personalized data** — appropriate for a genuinely public endpoint, wrong for anything scoped to a specific signed-in user.
- **A webhook-triggered `revalidateTag` with a profile doesn't guarantee the very next read anywhere sees fresh data** — verified directly. Anything expecting synchronous read-your-own-writes behavior from a webhook-driven revalidation needs `updateTag` semantics instead (Server-Action-only, so not directly usable from a Route Handler) or has to tolerate the same brief staleness window this topic measured.

## Interview Questions

**Q (High): Does Topic 1's automatically-generated `OPTIONS` handler satisfy a real browser's CORS preflight request?**

Answer: No. It sets only a plain `Allow` header listing supported HTTP methods — nothing CORS-specific (`Access-Control-Allow-Origin`, `-Methods`, `-Headers`). A route that needs to support real cross-origin requests has to define `OPTIONS` explicitly, returning the actual CORS headers a browser preflight checks before it will allow the real request through.

The trap: assuming the free `OPTIONS` handling from Topic 1 is a complete CORS solution because both involve an `OPTIONS` response — they solve different problems (listing allowed methods vs. authorizing cross-origin access) that happen to use the same HTTP verb.

**Q (High): Is CORS relevant to a webhook endpoint receiving calls from a third-party server (not a browser)?**

Answer: No — CORS is enforced by browsers specifically, restricting what cross-origin JavaScript running in a page is allowed to read from a response. A server-to-server call (a webhook from Stripe, GitHub, a CMS) isn't a browser and isn't subject to CORS at all. The actual security concern for a webhook is verifying the caller's identity — a shared secret token, a cryptographic signature — which is a completely separate mechanism from CORS headers.

The trap: conflating "public, unauthenticated-looking endpoint" concerns generally, applying CORS thinking to a context (server-to-server webhooks) where it simply doesn't apply.

**Q (Medium): A webhook route calls `revalidateTag(tag, 'max')` after verifying a request's authenticity. Does the very next unrelated request to a route reading that tag's cached data see the updated value immediately?**

Answer: Not necessarily — verified directly. `revalidateTag` with a profile argument is stale-while-revalidate: it schedules a background refresh rather than expiring the cache immediately. A read that happens to land right after the webhook call can still see the old, stale value while regeneration is in flight; a read shortly after typically sees the fresh value. This matches Phase 5 Topic 6's model, now observed across genuinely separate requests rather than within one action's own response.

The trap: assuming any call to `revalidateTag` guarantees the next reader sees fresh data — that guarantee specifically belongs to `updateTag`, not `revalidateTag`.

**Q (Medium): What's the actual "authentication" mechanism for a typical GET-based webhook callback URL, given that it can't have a logged-in user session?**

Answer: A shared secret, checked as a query parameter or header against a value only the legitimate caller (and the server) knows — verified directly in this topic's demo: a request with the wrong token gets rejected with `401` and produces no side effect, while the correct token succeeds. This is fundamentally different from the session-based authentication covered in Phase 5 Topic 7, appropriate here because the caller is a machine with no browser session to authenticate.

The trap: trying to apply session/cookie-based authentication patterns to a webhook endpoint, which by definition has no user session to check.

**Q (Low): Why doesn't a Route Handler receiving a webhook payload need `bodyParser` configuration, unlike a Pages Router API Route?**

Answer: Route Handlers are built on the standard Web `Request` object, which already exposes body-reading methods (`.text()`, `.json()`, `.formData()`) directly — there's no separate body-parsing middleware layer to configure the way Pages Router's `bodyParser` option required. The docs note this explicitly as a simplification over the older convention.

The trap: carrying over Pages-Router-era assumptions about needing explicit body-parsing configuration into App Router Route Handler code, where it's unnecessary.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why the automatic OPTIONS handler from Topic 1 doesn't satisfy a real CORS preflight
- [ ] Can explain why CORS is irrelevant to server-to-server webhook calls
- [ ] Can describe the shared-secret pattern as a webhook's actual authentication mechanism
- [ ] Can explain (and has seen verified) that a webhook-triggered revalidateTag doesn't guarantee the immediate next read sees fresh data
- [ ] Knows Route Handlers need no bodyParser-style configuration to read a webhook payload

---
*Next: Route Handlers vs Server Actions — this phase has built request/response endpoints throughout; the final topic is the direct decision framework for choosing between everything covered here and everything Phase 5 covered.*
