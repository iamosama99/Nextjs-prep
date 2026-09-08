# Migrating from Middleware to Proxy

**Demo:** `proxy-logic/topic-06-waituntil.ts` for the `waitUntil()` capability, plus a real run of the
official `@next/codemod` migration tool against an isolated test file (not this project — see below). Both
verified for real: the codemod genuinely renamed the file and function; `waitUntil()`'s background work was
confirmed still pending immediately after the response returned, and completed only after a further wait.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `npx @next/codemod@latest middleware-to-proxy .` | An automated rename: file, function, two config properties | Verified for real — genuinely renames `middleware.ts`→`proxy.ts` and `middleware`→`proxy` |
| `experimental.middlewarePrefetch` / `middlewareClientMaxBodySize` | Renamed to `experimental.proxyPrefetch` / `proxyClientMaxBodySize` | Easy to miss if only renaming the file by hand |
| `event.waitUntil(promise)` | Extends the proxy invocation's lifetime for background work | Verified: the client-facing response returns before the promise settles |
| `unstable_doesProxyMatch()` | A unit-testing utility for asserting matcher behavior without a live server | New in Next.js 15.1, part of this same modernization push |

## Where Does This Run?

Same position as every proxy topic — before routing. `waitUntil()`'s background work specifically continues running in the server process after the response has already been sent to the client, for as long as the promise it's given takes to settle.

## What Is This?

This topic covers two related things: the mechanics of actually migrating a `middleware.ts` file to `proxy.ts` (the rename itself, verified with the real official tool), and a capability that belongs to this same era of change — `NextFetchEvent.waitUntil()` for background work that shouldn't block the response.

> **Check yourself:** Does calling `event.waitUntil(promise)` inside proxy make the client wait for that promise to resolve before receiving a response?

## Why Does It Exist?

### Why "Proxy," precisely

Topic 1 already covered that the rename addresses confusion with Express.js-style middleware. Worth being precise about the second half of the docs' own reasoning: "Proxy" specifically evokes a *network boundary in front of the app* — code that "can run outside of your application's main runtime and handle requests before they reach your app," which is a more accurate description of what this feature actually does architecturally than "middleware" (a term that, in most other frameworks, implies code running *inside* the main request-handling pipeline, not ahead of a separate boundary). The docs also frame this as part of a broader philosophical shift: "we recommend users avoid relying on Middleware unless no other options exist" — the rename accompanies an explicit steer toward more specific, better-fitting APIs (a Server Action, a Route Handler, `next.config.js` redirects) wherever one exists, reserving proxy for what genuinely needs to run at that network boundary.

### Why `waitUntil()` exists

Some proxy-triggered work — logging, analytics, a fire-and-forget notification — has no reason to delay the response the client is waiting for, but does need to actually complete rather than being abandoned the instant the response is sent (a plain, un-awaited promise risks the server process considering the request "done" and not guaranteeing the promise gets to run to completion). `waitUntil()` exists to make that distinction explicit: extend this invocation's lifetime for the given promise, without making the client wait for it.

## How It Works

### The codemod, run for real

Rather than trust the documented behavior, this topic's verification ran the actual tool: `npx @next/codemod@canary middleware-to-proxy .` against an isolated test file (a temporary directory outside this project, cleaned up afterward — deliberately not run against the real project's already-correctly-named `proxy.ts`). The result matched the docs exactly: `middleware.ts` was renamed to `proxy.ts`, and the exported `middleware` function inside it was renamed to `proxy`, with the rest of the file's content — imports, logic, the `config` export — untouched. The docs additionally note the codemod also renames two `next.config.js` properties: `experimental.middlewarePrefetch` → `experimental.proxyPrefetch` and `experimental.middlewareClientMaxBodySize` → `experimental.proxyClientMaxBodySize` — easy to miss if migrating by hand rather than running the tool, since neither renamed property lives in the file being renamed.

### `waitUntil()`, verified with real timing

[`topic-06-waituntil.ts`](../../../proxy-logic/topic-06-waituntil.ts) calls `event.waitUntil(fetch(...))` against a Route Handler ([`api/hits/route.ts`](../../../app/playground/phase-07-proxy-edge/06-middleware-to-proxy-migration/api/hits/route.ts)) with a deliberate 1-second artificial delay, then returns `NextResponse.next()` immediately — *not* awaiting the `fetch` first. Verified directly: the request to the demo page completed in well under the background work's 1-second delay; a hit-count check immediately afterward still showed the pre-request count (proving the background POST genuinely hadn't completed yet); a check 1.5 seconds later showed the count incremented (proving the background work *did* eventually complete, rather than being abandoned). This is the concrete difference `waitUntil()` makes: without it, a plain un-awaited `fetch()` inside proxy has no guarantee of completing at all once the response goes out; with it, the platform keeps the invocation alive specifically to let that promise finish.

### `NextProxy` and testing utilities

Beyond `waitUntil()`, this same modernization introduced a `NextProxy` type (a shorthand inferring both `request` and `event` parameter types together, mentioned in Topic 1) and, since Next.js 15.1, unit-testing utilities under `next/experimental/testing/server`: `unstable_doesProxyMatch()` asserts whether a given URL/headers/cookies combination would trigger proxy at all (testing the `matcher` logic in isolation, without a live server), and `isRewrite()`/`getRewrittenUrl()`/`getRedirectUrl()` let a test assert what a proxy function's *response* actually does, again without spinning up a server.

## Gotchas

- **Migrating by hand (renaming the file, renaming the function) misses the `next.config.js` property renames** — `middlewarePrefetch`/`middlewareClientMaxBodySize` won't be caught by a simple find-and-rename pass over the proxy file itself, since they live in a different file entirely. The codemod catches both; a manual migration needs to remember both.
- **`waitUntil()` without actually calling it doesn't make an un-awaited promise safe.** A plain `fetch(...)` fired without `event.waitUntil(...)` wrapping it and without an `await` has no lifetime guarantee once the response is sent — `waitUntil()` is what provides that guarantee, not merely "not awaiting" on its own.
- **The codemod requires a clean git working tree** (verified directly — it refused to run and asked to stash/commit first, with a `--force` override available) — worth knowing before running it against an in-progress change set.

## Interview Questions

**Q (High): Does `event.waitUntil(promise)` delay the response proxy sends back to the client?**

Answer: No — verified directly with real timing. The response returns as soon as the proxy function returns, regardless of whether the promise passed to `waitUntil()` has settled yet. What `waitUntil()` provides is a guarantee that the *invocation itself* stays alive long enough for that promise to complete in the background, separate from whatever response was already sent to the client.

The trap: assuming `waitUntil()` is a way to run something "in the background" that starts only after the response — it starts immediately (whenever the code calls it), it just doesn't block the response from being sent.

**Q (High): What's the actual functional difference between calling `fetch(url)` and un-awaited, versus wrapping the exact same call in `event.waitUntil(fetch(url))`, inside proxy?**

Answer: An un-awaited `fetch()` with no `waitUntil()` has no guarantee of completing — the platform may consider the request finished (and free its resources) as soon as the response is sent, potentially cutting off in-flight background work. `waitUntil()` explicitly extends the invocation's lifetime for that specific promise, guaranteeing it gets to run to completion even though the client already has its response. Verified directly: the wrapped background call completed reliably ~1 second later, confirmed by a hit counter that had genuinely not moved immediately after the response, then had moved on a later check.

The trap: treating "not awaiting a promise" and "using `waitUntil()`" as equivalent because both let the response return quickly — only one of them guarantees the background work actually finishes.

**Q (Medium): Besides renaming the file and the exported function, what else does the official `middleware-to-proxy` codemod change, that a manual rename would likely miss?**

Answer: Two `next.config.js` properties: `experimental.middlewarePrefetch` becomes `experimental.proxyPrefetch`, and `experimental.middlewareClientMaxBodySize` becomes `experimental.proxyClientMaxBodySize`. Since these live in a separate config file rather than the proxy file itself, a manual migration focused only on renaming `middleware.ts` and its exported function has no obvious reason to also touch `next.config.js`, making this an easy thing to miss without running the actual tool.

The trap: assuming a manual find-and-rename covers the full migration surface just because the two most visible pieces (filename, function name) are easy to spot and fix by hand.

**Q (Medium): What does `unstable_doesProxyMatch()` let you test that a full integration test against a running server would otherwise require?**

Answer: Whether a given proxy `matcher` configuration would actually trigger for a specific URL (plus optional headers/cookies) — purely a static assertion against the matcher logic, with no server needed to run and no actual request to send. This is useful for testing routing/scoping logic (Topic 1's subject) in isolation from whatever the proxy function itself does once triggered.

The trap: assuming proxy logic can only be tested through slow, full end-to-end requests against a running dev or preview server.

**Q (Low): Why does the `middleware-to-proxy` codemod refuse to run against a directory with uncommitted git changes?**

Answer: It's a safety check — the codemod modifies files in place, and running it against uncommitted work risks conflating the codemod's own changes with whatever was already in progress, making it hard to review or revert either independently. Verified directly: it refuses by default and asks to stash or commit first, with an explicit `--force` flag available to override that check when the risk is understood.

The trap: assuming all codemods are safe to run against a dirty working tree, or being surprised when one refuses — this is a deliberate, documented safeguard, not a bug.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state precisely why "Proxy" was chosen as the replacement name, beyond just "confusion with Express"
- [ ] Can explain what `event.waitUntil()` actually guarantees, and that it does NOT delay the response
- [ ] Can name both `next.config.js` properties the codemod renames, beyond the file/function rename
- [ ] Can explain what `unstable_doesProxyMatch()` tests and why it doesn't need a live server
- [ ] Knows the codemod requires a clean git tree by default

---
*Next: Proxy performance & execution-order gotchas — this phase has repeatedly scoped matchers narrowly for isolation; the final topic covers where proxy actually sits in the full request pipeline, and the performance discipline the docs recommend given how frequently proxy runs.*
