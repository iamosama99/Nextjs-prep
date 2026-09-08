# Geolocation & A/B Testing Patterns

**Demo:** `proxy-logic/topic-04-geolocation-ab-testing.ts`. Verified for real: a manually-set
`x-vercel-ip-country` header is correctly echoed back via a resolved response header, and is correctly
reported `unknown` when absent; an A/B test bucket, once assigned and cookied on first visit, was confirmed
sticking across three subsequent requests with that cookie.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `request.geo` / `request.ip` | **Removed** from `NextRequest` in Next.js 15 | Training data or older tutorials referencing these are stale — code using them no longer compiles |
| `request.headers.get('x-vercel-ip-country')` | Reading a hosting-platform-supplied header directly | The actual current mechanism — the header only exists if the platform in front of the app sets it |
| `@vercel/functions`' `geolocation()`/`ipAddress()` | A Vercel-specific convenience wrapper around the same headers | Not core Next.js — only relevant when deployed on Vercel specifically |
| A cookie set on first visit, read on every visit after | The entire mechanism behind proxy-driven A/B testing | Verified: the same bucket is served consistently once the cookie exists |

## Where Does This Run?

Proxy, same position as every topic in this phase. Geolocation specifically depends on something *outside* Next.js entirely — whatever sits in front of the deployed app (a CDN, a hosting platform's edge network) actually determining the request's origin and attaching that as a header; Next.js itself has never computed geolocation.

## What Is This?

Two genuinely different capabilities that both live naturally in proxy because both need to run before routing decides what to render: reading where a request is coming from (to personalize or restrict content), and consistently bucketing a visitor into one of several variants of a page (to run a controlled experiment). This topic is also this repo's clearest case of *training data actively being wrong*: `NextRequest.geo` and `NextRequest.ip` are real, extensively-documented (in older material) properties that simply do not exist anymore.

> **Check yourself:** Does Next.js compute a request's geographic origin itself, or does it rely on something else to supply that information?

## Why Does It Exist?

### Geolocation: why it was removed, not just relocated

The docs are direct about why `geo`/`ip` were removed rather than kept as a convenience: those values were **always** supplied by the hosting provider — Next.js never computed them itself, it only ever read and re-exposed whatever the platform's own infrastructure attached to the request. Keeping a Next.js-specific property name around for platform-supplied data created a misleading abstraction — it looked like a Next.js feature but was actually a thin, platform-dependent pass-through, silently `undefined` on any host that doesn't attach that data. Removing the properties forces the (accurate) mental model directly: read the platform's own header, and know that the header's existence is entirely a hosting decision, not a Next.js guarantee.

### A/B testing: why proxy specifically

An A/B test needs to make the same bucketing decision *before* any page renders, consistently for the same visitor across requests, and (per Topic 2) ideally without changing the visible URL. Proxy is the one place positioned to intercept a request before routing, check a cookie to see if this visitor already has an assignment, and rewrite to the right variant — a genuine application of Topic 2's rewrite mechanism to a real-world use case rather than an illustrative toy.

## How It Works

### Geolocation, verified as a pure header read

[`topic-04-geolocation-ab-testing.ts`](../../../proxy-logic/topic-04-geolocation-ab-testing.ts)'s `/geo` handler reads `request.headers.get('x-vercel-ip-country')` — a Vercel-style header name used as the illustrative example, since the actual header name is entirely platform-specific (Cloudflare, for instance, uses different header names for the same concept). Verified directly: manually setting that header via `curl -H` produces `x-resolved-country: NL` in the response; omitting it produces `x-resolved-country: unknown`. This is the honest state of the demo — this project isn't deployed behind a geo-aware edge network, so there's no *real* geolocation happening locally, only proof that the read mechanism itself works correctly once such a header exists. On Vercel specifically, `@vercel/functions`'s `geolocation()`/`ipAddress()` functions wrap the same underlying headers with a friendlier API — a separate package, not part of core Next.js, and not usable (or meaningful) on other hosts.

### A/B testing, verified as a real sticky assignment

The `/ab-test` handler checks for an existing `ab_bucket` cookie; if present and valid, it reuses that value; otherwise it randomly assigns `'a'` or `'b'` and sets the cookie only on that first assignment. Either way, it rewrites (not redirects — Topic 2) to the corresponding variant page. Verified end-to-end: a fresh request with no cookie got assigned `"b"`, received a `Set-Cookie: ab_bucket=b`, and three subsequent requests carrying that cookie all consistently rendered "Variant B" — the assignment genuinely persists rather than re-randomizing on every visit.

### `NextResponse.rewrite()` doesn't create a routing loop back through proxy

The rewrite target (`/ab-test/variant-a` or `/variant-b`) is a longer, more specific pathname than the source (`/ab-test`) this topic's own dispatcher checks via exact equality — verified in practice: the rewritten request resolves straight to the variant page without re-triggering this same branch (which only matches the exact `/ab-test` path, not its variant sub-paths), so there's no infinite rewrite loop to guard against here specifically. A pattern that rewrote to a target matching its *own* trigger condition would need explicit loop protection; this one's specificity avoids the problem structurally.

## Gotchas

- **`request.geo` and `request.ip` are gone, not deprecated-but-working.** Code (or a candidate's stated knowledge) referencing them directly reflects a Next.js version before 15 — a codemod (`next-request-geo-ip`) exists specifically because this was a breaking removal, not a soft deprecation.
- **Geolocation headers are entirely a hosting-platform decision.** The same code that reads `x-vercel-ip-country` correctly on Vercel will read `unknown` (or whatever else) when self-hosted with nothing geo-aware in front — this isn't a bug in the code, it's an accurate reflection of "no platform supplied this data."
- **A/B bucket assignment needs to happen once and then stick** — the demo's `if (!existingBucket)` guard on setting the cookie is what prevents a returning visitor from getting silently re-randomized on every request, which would defeat the entire point of a controlled experiment.

## Interview Questions

**Q (High): Why were `geo` and `ip` removed from `NextRequest` in Next.js 15, rather than kept as a convenience?**

Answer: Because those values were never actually computed by Next.js — they were always supplied by the hosting provider's own infrastructure (a CDN, an edge network) and Next.js merely re-exposed whatever the platform attached to the request. Keeping Next.js-branded property names for entirely platform-dependent data was a misleading abstraction; removing them forces the accurate mental model of reading the platform's own header directly, with an explicit acknowledgment that its presence depends on the deployment target.

The trap: assuming this was an arbitrary API simplification rather than recognizing the actual reason — the properties represented capability Next.js never truly owned in the first place.

**Q (High): A demo reads `request.headers.get('x-vercel-ip-country')` and correctly resolves a country when tested with that header manually set via curl. Does this prove the app has working geolocation in production?**

Answer: No — it proves the *read mechanism* works correctly, nothing about whether real geolocation data will actually be present in production. That depends entirely on whether the actual hosting platform attaches that specific header (Vercel does, for its own edge network; a plain self-hosted Node server behind no geo-aware proxy does not, and the same code would consistently read `unknown`).

The trap: conflating "the code correctly reads a header when I manually set it" with "this code has geolocation working" — the latter is a deployment-environment fact, not a code-correctness fact.

**Q (Medium): Why does the A/B testing pattern in proxy use a rewrite rather than a redirect to serve a test variant?**

Answer: A rewrite keeps the URL the visitor sees stable — important for an A/B test, since the whole point is that different visitors get different underlying content while sharing one consistent, shareable/bookmarkable URL. A redirect would send different users to visibly different addresses, undermining that goal (and complicating anything relying on the URL, like analytics attribution).

The trap: reaching for a redirect out of familiarity, without connecting back to Topic 2's distinction between the two mechanisms and which one actually fits this use case.

**Q (Medium): In the A/B test demo, what specifically prevents a returning visitor (who already has an `ab_bucket` cookie) from being randomly reassigned to a different variant on their next visit?**

Answer: The cookie is only set when no existing valid bucket value was found (`if (!existingBucket)`), and the bucket value used for the rewrite itself always prefers the existing cookie's value when present and valid, falling back to a fresh random assignment only when it's genuinely absent or invalid. Without that check, every request would re-randomize regardless of any prior assignment, defeating the purpose of a controlled experiment.

The trap: writing the random assignment unconditionally on every request instead of gating it behind "does a valid assignment already exist" — an easy bug that silently breaks the experiment's validity without causing any visible error.

**Q (Low): Is `@vercel/functions`' `geolocation()` function part of core Next.js?**

Answer: No — it's a separate package specific to Vercel's own hosting platform, wrapping the same underlying platform-supplied headers with a friendlier API. It's only meaningful when actually deployed on Vercel; on any other host, the underlying headers (and thus this package's usefulness) simply don't apply the same way.

The trap: treating a Vercel-specific convenience package as if it were a Next.js-provided, host-agnostic API — the actual host-agnostic approach is reading whatever header the real deployment target supplies directly.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state that `request.geo`/`request.ip` are removed (not deprecated) and name the migration codemod
- [ ] Can explain why geolocation was always platform-supplied, never Next.js-computed
- [ ] Can explain why A/B testing uses rewrite rather than redirect
- [ ] Can explain what specifically makes an A/B bucket assignment "sticky" rather than re-randomizing every visit
- [ ] Knows `@vercel/functions`' geolocation helpers are Vercel-specific, not core Next.js

---
*Next: The Edge Runtime — what it was, and its Next.js 16 deprecation. This topic has been reading platform headers and cookies in proxy without asking what environment that code actually executes in; the next one is exactly that question, and why it now has a much simpler answer than it used to.*
