# Auth Checks in Proxy (Optimistic vs. Secure Checks)

**Demo:** `proxy-logic/topic-03-auth-checks.ts`. Verified end-to-end with a real cookie jar: no session →
redirected to login; logging in sets a real cookie and redirects to the dashboard; the dashboard with a
session serves real content; visiting login while already "authenticated" redirects back to the dashboard.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| Proxy reading `request.cookies.has('session')` | An **optimistic** check — presence/shape only | No database round trip — proxy runs on every matched request, including prefetches |
| A DAL's `verifySession()` checking a database | A **secure** check | The actual authorization boundary — required regardless of what proxy already did |
| Proxy redirecting an unauthenticated user away from `/dashboard` | A UX improvement, not the security boundary | Verified: this alone doesn't make `/dashboard`'s data safe — Phase 5 Topic 7's lesson, one layer up |
| `Proxy uses the Node.js runtime` (docs, verbatim) | A compatibility constraint on which auth/session libraries work in proxy | Not every auth library is proxy-safe by default — Topic 5 covers why this specifically matters now |

## Where Does This Run?

Proxy, before routing — same position as every topic in this phase. The distinguishing fact this topic centers on is *what kind* of check is safe to perform there, given that position.

## What Is This?

The docs draw a sharp, named distinction: an **optimistic** check reads session data straight from a cookie — fast, no I/O, good enough for "should the UI even try to render this, or should I redirect first" — while a **secure** check verifies against a database, appropriate for anything that actually gates sensitive data or a mutation. Proxy is explicitly positioned as the optimistic-check layer: [`topic-03-auth-checks.ts`](../../../proxy-logic/topic-03-auth-checks.ts) reads only whether a session cookie is *present* (`request.cookies.has(...)`) — no decryption, no database call — before deciding whether to redirect.

> **Check yourself:** Does proxy redirecting an unauthenticated user away from `/dashboard` mean `/dashboard`'s data is now safe from an unauthenticated direct request to whatever actually serves that data?

## Why Does It Exist?

Proxy runs on **every matched request** — not just full page loads, but prefetches too (Phase 2's `next/link` prefetching, Phase 3's Router Cache). A database round trip on every one of those is a real, measurable performance cost, multiplied across every hover-triggered prefetch a user's browser fires. The docs are explicit about this constraint: proxy is good for centralizing *optimistic* redirect logic — pre-filtering the obviously-unauthenticated case cheaply — but should never be the only or the primary line of defense, because it structurally cannot afford to do the expensive, authoritative check on every invocation.

## How It Works

### The optimistic check, verified end-to-end

This topic's demo redirects `/dashboard` to `/login` when no `demo_proxy_session` cookie exists, and redirects `/login` to `/dashboard` when one does — verified as a real, working round trip: an unauthenticated request to `/dashboard` gets a genuine `307` to `/login`; hitting a login endpoint sets a real `Set-Cookie` header and redirects to `/dashboard`; a subsequent authenticated request to `/dashboard` gets real `200` content; and revisiting `/login` while "authenticated" correctly bounces back to `/dashboard`. All four of proxy's four possible redirect/no-op decisions in this pattern were independently confirmed.

### What "optimistic" deliberately leaves out

Nothing in `topic-03-auth-checks.ts` touches a database, decrypts a signed payload, or verifies the cookie's contents in any way beyond its mere presence — this demo keeps the cookie itself to a plain flag specifically to isolate the *proxy mechanics* from session-cryptography plumbing (the docs' own example does decrypt a real JWT-style session in proxy, since that's still cheap — no I/O, just computation). The genuinely load-bearing rule is "no database call," not "no decryption at all." Either way, this check answers only "does something claiming to be a session exist" — never "is this specific request actually authorized to see this specific data," which requires reading the real session's contents (at minimum) and often a database lookup.

### The dashboard's data is still not actually protected — same lesson as Phase 5 Topic 7, one layer up

[`dashboard/page.tsx`](../../../app/playground/phase-07-proxy-edge/03-auth-checks-in-proxy/dashboard/page.tsx) deliberately does nothing beyond rendering — it re-checks nothing. This is intentional, to make the point starkly: proxy's redirect only ever protects the *page render UI-gating* the same way Phase 5 Topic 7 demonstrated for a page-level `redirect()` failing to protect a Server Action defined on that page. The pattern repeats: a check at one layer (page render, or here, proxy) never automatically extends to a different entry point (a Server Action, a Route Handler, or in a real version of this dashboard, whatever actually fetches the protected data). The docs' own recommended fix is the same Data Access Layer pattern already covered — a `verifySession()` function, backed by a real database check, called from wherever data is actually read, independent of whatever proxy already decided.

### The Node.js runtime constraint

The docs state plainly: "Proxy uses the Node.js runtime, check if your Auth library and session management library are compatible." This is a genuinely new consideration as of Next.js 16 (Topic 5 covers why) — under the old Edge-Runtime-capable middleware model, some auth libraries had Edge-specific builds or constraints; now that proxy is Node.js-only, that particular compatibility question has actually gotten *simpler* (most auth libraries assume Node.js by default), but it's still worth explicitly verifying for any library predating this change.

## Gotchas

- **A proxy-level redirect is a UX nicety, not a security boundary.** It stops a browser from *seeing* a page it shouldn't navigate to under normal use, but it does nothing to stop a direct, deliberate request to whatever actually serves that page's underlying data — verified conceptually via the same lesson Phase 5 Topic 7 demonstrated concretely for Server Actions.
- **"Optimistic" specifically means no database call, not "no verification at all."** A real implementation should still decrypt/verify the session's signature in proxy (cheap, no I/O) — what's actually forbidden is the database round trip, because of proxy's every-request-including-prefetches execution frequency.
- **Proxy's `matcher` recommendation for auth is "run on all routes"** — narrowly scoping it (the way Topics 1 and 2's demos narrowly scope their own matchers, for isolation) is the wrong instinct for a real auth-gating proxy, which generally wants broad coverage precisely so nothing slips through unchecked.

## Interview Questions

**Q (High): What's the difference between an "optimistic" and a "secure" authorization check, and which one is proxy meant for?**

Answer: An optimistic check reads session data directly from a cookie — no database call, cheap enough to run on every request. A secure check verifies against a database or other authoritative source — the real authorization boundary, but too expensive to run on every proxy invocation given proxy's every-request-including-prefetches execution frequency. Proxy is meant specifically for optimistic checks — pre-filtering obviously-unauthenticated requests with a cheap redirect — never as the sole or primary authorization mechanism.

The trap: treating proxy's redirect as sufficient protection on its own, rather than recognizing it as a fast pre-filter that still requires a secure check somewhere closer to the actual data.

**Q (High): A proxy redirects unauthenticated users away from `/dashboard`. Is `/dashboard`'s underlying data now protected from a direct, unauthenticated request to whatever actually serves it?**

Answer: No — this is the same lesson Phase 5 Topic 7 demonstrated concretely for Server Actions, one layer up: a check at one entry point (here, proxy's page-level redirect) doesn't automatically extend to a different entry point. If `/dashboard` fetches data via a Server Action, Route Handler, or direct database call that doesn't independently re-verify the session, that entry point remains exploitable regardless of what proxy already decided for the page render.

The trap: treating a proxy-level auth redirect as equivalent to actually securing the data — conflating "the UI won't show this to an unauthenticated browser" with "an unauthenticated request can't obtain this data."

**Q (Medium): Why does proxy's recommended optimistic check avoid a database call, specifically?**

Answer: Proxy runs on every matched request, including prefetches triggered by hovering over a `next/link` — not just full page navigations. A database round trip on every one of those requests is a real, multiplied performance cost across a user's normal browsing behavior, which is why the docs specifically flag avoiding database checks in proxy to prevent performance issues, while still allowing (and demonstrating) decrypting a session cookie there, since that's pure computation with no I/O.

The trap: assuming "optimistic" means "skip verification entirely" rather than the more precise "skip the expensive I/O specifically."

**Q (Medium): Does Next.js 16's Proxy being locked to the Node.js runtime make auth library compatibility easier or harder than before?**

Answer: Generally easier — the docs flag it as something to verify, but most auth and session-management libraries assume a Node.js environment by default. Under the old middleware model, where Edge Runtime was an option (and, in earlier versions, close to the default expectation), some libraries needed Edge-specific builds or had compatibility gaps; now that proxy is Node.js-only, that particular class of compatibility problem has largely gone away, though it's still worth explicitly checking for any library or code predating this change.

The trap: assuming the runtime lock-down is purely a new constraint to work around, without recognizing it actually simplifies a real compatibility question that used to require more careful checking.

**Q (Low): Should an auth-gating proxy's `matcher` be narrowly scoped (like Topics 1 and 2's isolated demo matchers) or broadly cover most/all routes?**

Answer: Broadly, generally — the docs' own guidance for auth specifically recommends proxy run on all routes (or as close to all as practical), specifically so nothing slips through unchecked. This is different from Topics 1 and 2's demos, which deliberately scoped their matchers narrowly to isolate one topic's logic from another in this phase's single shared `proxy.ts`.

The trap: applying the "scope your matcher narrowly" instinct from earlier topics uniformly to auth logic, where broad coverage is usually the actual goal.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can define "optimistic" vs. "secure" checks and state which one proxy is meant for
- [ ] Can explain, using the Phase 5 Topic 7 parallel, why a proxy redirect doesn't protect the underlying data
- [ ] Can explain precisely what "optimistic" rules out (a database call) vs. what it still allows (cookie decryption)
- [ ] Knows why proxy avoids database calls specifically (execution frequency, including prefetches)
- [ ] Can explain why proxy's Node.js-only runtime generally simplifies auth library compatibility

---
*Next: Geolocation & A/B testing patterns — this topic used a simple boolean cookie check; the next one covers reading (and, since Next.js 15, no longer directly reading) request-derived signals like location, and using a cookie-bucketing pattern for A/B tests built on Topic 2's rewrite mechanics.*
