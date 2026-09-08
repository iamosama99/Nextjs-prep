# Rewrites, Redirects & Headers from Proxy

**Demo:** `proxy-logic/topic-02-rewrites-redirects-headers.ts`, dispatched from the root `proxy.ts`. Every
behavior verified for real: a redirect changes the URL bar (a real `307` with the right `Location`), a
rewrite serves different content at the same URL, and a header set on the request genuinely reaches a
Server Component while a header set on the response genuinely reaches the client — confirmed independently.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `NextResponse.redirect(url)` | A real HTTP redirect (`307` by default) | The browser's URL bar changes — verified |
| `NextResponse.rewrite(url)` | Serves different content at the **same** URL | The browser's URL bar does **not** change — verified |
| `NextResponse.next({ request: { headers } })` | Forwards a header **upstream** to the page/handler | Never sent to the client — verified via a Server Component reading it |
| `response.headers.set(...)` on the returned `NextResponse` | Sets a header on the **response** the client receives | Never seen upstream — a completely different header, going the other direction |

## Where Does This Run?

Server-side, in proxy, before the request reaches routing — same execution position as Topic 1. What's specific here is *what* proxy does once it decides to act, rather than whether it runs at all.

## What Is This?

Once proxy has matched a request (Topic 1), it has four broad ways to respond: let it continue unmodified (`NextResponse.next()`), send it somewhere else visibly (`redirect`), serve different content invisibly (`rewrite`), or answer directly without involving any page or Route Handler at all (returning a plain `Response`/`NextResponse`, covered fully in Topic 3). This topic covers the first three, plus the header-manipulation capability that can accompany any of them.

> **Check yourself:** A user visits `/old-page`. Proxy rewrites it to `/new-page`. What does the browser's address bar show?

## Why Does It Exist?

A redirect and a rewrite solve genuinely different problems, and conflating them is a common, real mistake. A redirect tells the *browser* to go somewhere else — appropriate when the URL itself is meant to change (a moved page, a canonical URL). A rewrite tells the *server* to serve different content while the browser stays exactly where it was — appropriate when the URL should stay stable from the user's perspective (an A/B test variant, a locale-specific version, a legacy path quietly proxied to new content). Header manipulation exists for passing information across the proxy boundary without exposing it to the client (an auth check's result, a computed value) or, separately, for genuinely wanting the client to see something new.

## How It Works

### Redirect: a real status code, a real URL change — verified

[`topic-02-rewrites-redirects-headers.ts`](../../../proxy-logic/topic-02-rewrites-redirects-headers.ts) redirects `/old-page` to `/new-page` via `NextResponse.redirect(new URL(...))`. Verified directly: the response is a genuine `307 Temporary Redirect` with a `Location` header pointing at `/new-page` — a real browser would navigate there and its address bar would reflect it. Note there's no `page.tsx` at `/old-page` in this demo at all — proxy runs *before* filesystem routing resolves (Topic 7's execution order), so the redirect fires regardless of whether a page exists at the source path.

### Rewrite: content changes, the URL doesn't — verified

The same file rewrites `/rewrite-me` to `/actual-content` via `NextResponse.rewrite(new URL(...))`. Verified directly: fetching `/rewrite-me` returns `/actual-content`'s rendered HTML (`<h1>Actual Content</h1>`) — the page component has no idea it was reached via a rewrite; it just renders normally, and proxy transparently substituted which page actually served the request. Just like the redirect case, `/rewrite-me` has no `page.tsx` of its own — only the destination, `/actual-content`, needs to exist.

### Two different headers, two different directions — verified independently

The `/headers-demo` route sets both kinds of header in one response, and this topic's demo verifies each one on its own axis:

- **Request header, forwarded upstream**: `NextResponse.next({ request: { headers: requestHeaders } })` makes `x-hello-from-proxy-upstream` available to whatever renders next — verified by a Server Component reading it via `headers()` from `next/headers` and displaying its value (`hello-request`) directly in the rendered page. This header is never sent back to the client at all.
- **Response header, sent to the client**: `response.headers.set('x-hello-from-proxy-response', ...)` — verified via `curl -i`, which shows `x-hello-from-proxy-response: hello-response` on the actual HTTP response the browser would receive.

The docs are specific about the correct request-header pattern: `NextResponse.next({ request: { headers } })`, **not** `NextResponse.next({ headers })` — the latter is a different thing entirely (a shorthand for sending headers to the *client*, discouraged because it risks silently overriding framework-managed headers like the `Content-Type` Server Actions depend on). This topic's demo uses the correct, documented form for the upstream case and a separate, explicit `response.headers.set(...)` call for the client-facing case — never conflating the two.

## Gotchas

- **Redirect and rewrite are not interchangeable, and mixing them up produces confusing symptoms.** A rewrite where a redirect was intended leaves the user on a URL that doesn't reflect what's actually being shown (bad for bookmarking/sharing); a redirect where a rewrite was intended breaks anything relying on the URL staying stable (an A/B test cookie keyed to the original path, for instance).
- **`NextResponse.next({ headers })` (no `request` wrapper) is a different, discouraged operation** from `NextResponse.next({ request: { headers } })` — one sends headers to the client, the other forwards them upstream. Getting this backwards either leaks internal signaling headers to the browser or fails to actually pass data to the page/handler that needed it.
- **Neither the redirect source nor the rewrite source needs a `page.tsx` to exist.** Proxy intercepts before filesystem routing resolves, so a route that exists purely as a proxy target (never meant to render its own content) is completely normal, not a missing-file bug.

## Interview Questions

**Q (High): What's the concrete difference between what a user's browser shows after a proxy-issued redirect versus a proxy-issued rewrite, for the same source URL?**

Answer: After a redirect, the browser's address bar changes to the destination URL — it's a real navigation, verified as a genuine HTTP redirect status with a `Location` header. After a rewrite, the address bar stays exactly where the user was — the server serves different content transparently, verified by fetching the source URL and getting the destination's actual rendered content back, with no indication in the response that a rewrite occurred.

The trap: describing both as "sending the user somewhere else," which is only true for redirects — a rewrite's entire point is that nothing about the user-visible URL changes.

**Q (High): Why does the docs' recommended pattern for forwarding a header upstream use `NextResponse.next({ request: { headers } })` instead of `NextResponse.next({ headers })`?**

Answer: They do different things. `{ request: { headers } }` modifies what the *server* (the page or Route Handler proxy is about to hand off to) receives — never exposed to the client. `{ headers }` (no `request` wrapper) is a shorthand for sending headers directly to the *client*, and the docs actively discourage it because it can override framework-managed response headers (like the `Content-Type` Server Actions depend on), breaking submissions or streaming in ways that are hard to trace back to this cause.

The trap: using the shorter, headers-only form out of habit or because it "looks similar," without recognizing it sends data in the opposite direction from what's usually intended.

**Q (Medium): Does a route that a proxy always redirects away from need to have its own `page.tsx`?**

Answer: No — verified directly. Proxy runs before filesystem routing resolves which page or route to render, so a redirect (or rewrite) fires unconditionally regardless of whether anything exists at the source path. A route that exists purely to be intercepted by proxy and never actually render its own content is a completely normal pattern.

The trap: assuming every path referenced anywhere in the app must have a corresponding `page.tsx`, and being confused when a proxy-only route doesn't.

**Q (Medium): A header set via `response.headers.set(...)` on a `NextResponse` returned from proxy — does a Server Component reading `headers()` from `next/headers` see that header?**

Answer: No — verified as two independently-checkable facts in this topic's demo. A header set directly on the response (via `response.headers.set(...)`) travels to the *client*, not upstream to the rendering page; a Server Component's `headers()` call reflects the *request* headers, which only include what was forwarded via `NextResponse.next({ request: { headers } })`. They're separate header sets serving separate directions, not two views of the same data.

The trap: assuming "I set a header on the response object" is sufficient for a Server Component downstream to see it — the response header and the forwarded request header are genuinely different mechanisms.

**Q (Low): Why might an A/B test implementation prefer a rewrite over a redirect for serving a test variant?**

Answer: A rewrite keeps the URL stable — the user (and anything tracking or bookmarking based on the URL, like analytics or a shared link) sees one consistent address regardless of which variant is actually being served, while the content underneath can differ per-user (typically driven by a cookie set in the same proxy pass, Topic 4). A redirect would send different users to visibly different URLs, defeating the "same experience, different implementation" goal of an A/B test.

The trap: reaching for a redirect because it's the more commonly known mechanism, without considering that changing the visible URL is specifically the wrong behavior for this use case.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state precisely what changes (and doesn't) in the browser for a redirect vs. a rewrite
- [ ] Can write the correct `NextResponse.next({ request: { headers } })` pattern from memory and explain why it differs from the headers-only shorthand
- [ ] Can explain why a proxy-only redirect/rewrite source needs no `page.tsx`
- [ ] Can explain why a response header and a request-forwarded header are two separate mechanisms, not one
- [ ] Can name a concrete reason A/B testing typically uses rewrites rather than redirects

---
*Next: Auth checks in Proxy — this topic covered the mechanics of redirecting/rewriting/setting headers; the next one applies them to the specific, high-stakes case of gating access based on a session, including exactly how far proxy alone should be trusted for that.*
