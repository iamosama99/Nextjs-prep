# `not-found.tsx` & `notFound()`

> **Live demo:** `npm run dev` → [/playground/phase-02-app-router/11-not-found](http://localhost:3000/playground/phase-02-app-router/11-not-found)

## Quick Reference

| Fact | Detail |
|---|---|
| Component type | Server Component by default — no `'use client'` needed (unlike `error.tsx`) |
| Triggered by | Calling `notFound()` (from `next/navigation`) anywhere in the segment, **or** automatically when no route matches at all |
| HTTP status | Sets a real `404` status code — not a cosmetic "not found" message on a `200` response |
| Scope | Per-segment, like `error.tsx` — nearest `not-found.tsx` above the call site handles it |
| Root fallback | `app/not-found.tsx` also catches genuinely unmatched URLs (no `page.tsx` matches anywhere) |

## Where Does This Run?

Server — `notFound()` is typically called inside an `async` Server Component after a data lookup comes back empty (e.g., a product ID that doesn't exist in the database).

## What Is This?

`not-found.tsx` is the UI Next.js renders when `notFound()` is explicitly called from within that segment, or when an incoming request simply doesn't match any route in the app at all. Unlike `error.tsx`, it represents an *expected*, well-formed outcome — "this specific resource genuinely doesn't exist" — rather than something going wrong.

> **Check yourself:** A product page does `const product = await getProduct(id); if (!product) { /* ??? */ }`. What's the correct thing to put in that branch, and why is it not just `return <p>Not found</p>;`?

## Why Does It Exist?

Distinguishing "this failed" from "this doesn't exist" matters for more than just UI polish — it matters for HTTP semantics and SEO. A product page for a deleted item should return a real `404` status so search engines correctly deindex it and monitoring tools don't count it as a server error; a database timeout fetching that same product should return a `5xx`-flavored error state instead, since it's a transient failure, not confirmation the resource is gone. `not-found.tsx` and `notFound()` exist to make the first case easy and correct by default, cleanly separated from `error.tsx`'s handling of the second.

## How It Works

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound(); // renders the nearest not-found.tsx; nothing after this line runs
  }

  return <ProductDetail product={product} />;
}
```

**Calling `notFound()` throws internally** — it's implemented as a special, Next.js-recognized error that the framework intercepts specifically (rather than treating as an application error) to render the nearest `not-found.tsx` boundary and correctly set the response status to `404`. Because it throws, **any code after the call in that function does not execute** — this is the same mental model as `redirect()` (Phase 5/6 territory): treat it as a control-flow exit, not a value you return or continue past.

**Why a plain `if (!product) return <p>Not found</p>;` is the wrong instinct:** it renders content that *looks* like a 404 to a human, but the actual HTTP response status is still `200 OK` — search engine crawlers and any tooling that inspects status codes will treat the page as a normal, successful, indexable page with the text "Not found" on it, which is both bad for SEO (a phantom page gets indexed) and semantically incorrect. `notFound()` fixes both problems at once by actually changing the response's status code.

**Root-level fallback:** `app/not-found.tsx` also serves as the catch-all for requests that don't match *any* route in the app whatsoever — the App Router equivalent of a classic global 404 page — separate from any segment-specific `not-found.tsx` triggered by an explicit `notFound()` call deeper in the tree.

> **Check yourself:** Two different situations both end up showing "not found" UI: a URL that matches no route at all, and a URL that matches a route but whose `notFound()` gets called after a failed lookup. Do these necessarily render the same `not-found.tsx` file?

## Gotchas

- **Rendering "not found" text manually instead of calling `notFound()`** is the single most common mistake — it silently ships a `200` status for a page that should be a `404`, which is invisible in casual testing but real damage for SEO and any status-code-aware tooling.
- **Expecting code after `notFound()` to still run.** Because it throws, anything written after the call in that function is dead code — this occasionally surprises people who mentally model it as a conditional render rather than a thrown control-flow exit.
- **Assuming `not-found.tsx` needs `'use client'`, out of habit from `error.tsx`.** It doesn't — it's a Server Component by default, since there's no error-boundary-specific client requirement here; `notFound()` triggering it is a Next.js-level interception, not a React error-boundary mechanism.

## Interview Questions

**Q (High): What's the actual difference between manually rendering "Not Found" text in your JSX vs. calling `notFound()`? Why does it matter for SEO?**

Answer: Manually rendering "not found" text still returns a normal `200 OK` HTTP status — the page looks like a 404 to a human reader but is indistinguishable from any successful page to a search engine crawler or monitoring tool, which will index it as legitimate content or fail to flag it as gone. Calling `notFound()` sets an actual `404` status code on the response, which correctly signals to crawlers that the resource doesn't exist (leading to proper deindexing) and to any status-code-aware infrastructure that this wasn't a successful request.

The trap: treating this as a purely cosmetic UI choice rather than an HTTP-semantics and SEO-correctness issue — a senior answer connects the dots to actual status codes, not just visual output.

**Q (High): Is `not-found.tsx` a Server or Client Component by default, and why does that make sense compared to `error.tsx`?**

Answer: Server Component by default — it doesn't require `'use client'`. This makes sense because, unlike `error.tsx`, `not-found.tsx` isn't implemented via a React error boundary's client-only lifecycle machinery; `notFound()` is a Next.js-level function that throws a special, framework-recognized signal which Next.js intercepts to render the matching `not-found.tsx` and set the correct status code — a mechanism the framework controls end-to-end on the server, with no inherent need for client-side interactivity.

The trap: assuming every special file that "catches" something requires `'use client'` by analogy with `error.tsx`, without distinguishing the different underlying mechanisms (React error boundary vs. Next.js-level interception).

**Q (Medium): Where does code execution go after `notFound()` is called in a Server Component — does subsequent code in that function still run?**

Answer: No — `notFound()` throws internally, so it functions as a control-flow exit; any code written after the call in the same function does not execute, exactly analogous to how a `redirect()` call behaves.

The trap: writing code after `notFound()` expecting it to run as a fallback or cleanup step, not realizing the function never returns normally.

**Q (Medium): What triggers the root `app/not-found.tsx` specifically, versus a nested one?**

Answer: The root `app/not-found.tsx` is the catch-all for requests that don't match *any* route in the entire app — no `page.tsx` anywhere corresponds to the URL at all. A nested `not-found.tsx` (say, `app/products/[id]/not-found.tsx`) is triggered specifically by an explicit `notFound()` call within that segment, typically after a data lookup determines a specific resource doesn't exist, even though the *route itself* matched correctly.

The trap: conflating "no route matched" with "a route matched but the requested resource within it doesn't exist" — they're different situations that can render different `not-found.tsx` files depending on where each is defined.

**Q (Low): Do you need `'use client'` in `not-found.tsx`?**

Answer: No — it's a Server Component by default, unlike `error.tsx` which requires it.

The trap: adding `'use client'` reflexively out of habit from working with `error.tsx`, when it's not required (and would be an unnecessary constraint) here.

---

## Self-Assessment

- [ ] Can explain, without notes, why manually rendered "not found" text is an SEO problem that `notFound()` fixes
- [ ] Knows `notFound()` throws, and that code after the call doesn't execute
- [ ] Can state confidently that `not-found.tsx` is a Server Component by default and articulate why, contrasted with `error.tsx`
- [ ] Can distinguish "no route matched at all" from "a route matched but `notFound()` was explicitly called"
- [ ] Would reach for `notFound()` by default any time a lookup legitimately comes back empty in a Server Component

---
*Next: Linking & navigating (`next/link`, `useRouter`, `usePathname`, `useSearchParams`) — closing out Phase 2 with how users and code actually move between all these routes, including the automatic prefetching behavior and the Suspense requirement `useSearchParams` introduces.*
