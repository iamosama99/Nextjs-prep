# The Edge Runtime — What It Was, and Its Next.js 16 Deprecation

**Demo:** None — deliberately. Deprecated code doesn't belong permanently in this repo (per this project's
own `AGENTS.md`: heed deprecation notices). Instead, both facts below were verified by temporarily adding
the deprecated configuration, capturing the real build error, and reverting — the same "trigger for real,
then clean up" method Phase 4 used for build-error gotchas, just without keeping the broken code around
afterward.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `export const runtime = 'edge'` on a route | **Deprecated** — docs say remove it entirely | Not "discouraged," an actual deprecation with a documented removal path |
| Any `export const runtime = ...` on a route, **in this project** | A hard **build error**, verified directly | `cacheComponents: true` rejects the `runtime` segment config outright, for any value, not just `'edge'` |
| `export const runtime = ...` in `proxy.ts` | A hard build error, verified directly | Proxy never supported choosing a runtime — verified message: "Proxy always runs on Node.js runtime" |
| Edge Runtime's actual capability set | Web Platform APIs only — no native Node.js APIs, no filesystem, no ISR | The real reason moving code onto (or off of) it could break things |

## Where Does This Run?

This is inherently a "where does code run" topic — its entire subject is the choice between two execution environments Next.js has historically offered.

## What Is This?

The Edge Runtime was a second, lighter-weight JavaScript execution environment Next.js offered alongside the default Node.js runtime — built on the same V8-isolate technology as Cloudflare Workers, exposing only standard Web Platform APIs (`fetch`, `Request`/`Response`, `crypto.subtle`, `ReadableStream`, and similar) rather than the full Node.js API surface. It existed specifically because proxy/middleware needs to run *before* routing, ideally with minimal cold-start latency and close to wherever the request physically originates — a full Node.js process is comparatively heavy to spin up for that purpose, while a V8 isolate can start in a fraction of the time.

> **Check yourself:** Was the Edge Runtime a full alternative to Node.js, or a deliberately restricted subset of it?

## Why Does It Exist? — Then, and Its Deprecation Now

### Then: cold starts and network position

The core tradeoff Edge Runtime offered: give up native Node.js APIs (no filesystem access, no arbitrary `node_modules` using Node-specific bindings) in exchange for near-instant startup and the ability to run distributed across a network's edge locations rather than one central server region. For latency-sensitive, run-on-every-request code like middleware, that tradeoff was historically compelling enough that Edge Runtime wasn't just an option for middleware — it was, for a long stretch of Next.js's history, essentially the *only* option. Per the version history: Middleware shipped in beta in v12.0.0 and went stable in v12.2.0 on Edge Runtime; the Node.js runtime didn't become available for middleware until v15.2.0 (experimental), stabilizing only in v15.5.0. Anyone who learned Next.js middleware during that multi-year window learned it as an Edge-first, sometimes Edge-only feature — which is exactly why "Edge vs. Node.js for middleware" was, until very recently, a genuinely load-bearing distinction and a fair interview question.

### Now: deprecated, and (in this project specifically) outright rejected

Next.js 16 changes this decisively. The `runtime` segment config's own reference doc states plainly: *"The Edge Runtime is deprecated. Remove the `runtime` export from your route files."* — not "consider migrating," a direct instruction to remove it. Proxy, meanwhile, never offered a choice at all as of v16: it "defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy files. Setting the `runtime` config option in Proxy will throw an error" (Topic 1). This project's own configuration adds a second, sharper layer verified directly: with `cacheComponents: true` set (since Phase 3), setting **any** `runtime` value at all on a regular route — `'edge'` or even the supposedly-default `'nodejs'` — produces a hard build failure, not a warning:

```
Error: Route segment config "runtime" is not compatible with `nextConfig.cacheComponents`. Please remove it.
```

This matches (and sharpens) what Phase 3 Topic 11's model-comparison table already noted for `runtime = 'edge'` specifically ("Not supported — Cache Components requires Node.js"): under Cache Components, Node.js isn't merely the default, it's the *only* option, unconditionally, to the point that even redundantly declaring the default explicitly is rejected. And separately, verified directly for `proxy.ts` itself:

```
Error: Route segment config is not allowed in Proxy file at "./proxy.ts". Proxy always runs on Node.js runtime.
```

Two different error messages, two different scopes — one about Cache Components' interaction with regular routes, one about Proxy's runtime having never been configurable in the first place — both converging on the same practical answer: there is no Edge-vs-Node.js decision left to make here.

## What the Edge Runtime Actually Restricted

Worth knowing precisely, since this is the part of "why did my code break on Edge" that outlives the deprecation for anyone reading or maintaining older code:

- **No native Node.js APIs.** No filesystem access, no arbitrary Node built-ins — code (and its dependencies) had to stick to Web Platform APIs or ES-Modules-only packages with no native Node bindings.
- **No Incremental Static Regeneration.** ISR was explicitly unsupported on Edge Runtime.
- **`eval`, `new Function(evalString)`, and WebAssembly's `compile`/`instantiate` were disabled outright** — dynamic code evaluation was restricted for the isolate model's sake, with a narrow, explicit `unstable_allowDynamic` glob-pattern escape hatch for cases where dead code elimination couldn't prove such a statement was unreachable.
- **`require` was disallowed** — ES Modules only.

This explains a genuinely common historical failure mode: a `node_modules` package that quietly used a native Node.js API internally would work fine in a normal route but throw confusingly on Edge-configured middleware, because the restriction wasn't about the *language*, it was about which host APIs were actually present in the V8 isolate.

## Gotchas

- **"Deprecated" here means an actual removal instruction, not a soft nudge.** The `runtime` reference doc's own words are "remove the `runtime` export from your route files" — treat existing `export const runtime = 'edge'` in any codebase as something to migrate off of, not merely something to be aware of.
- **Under Cache Components specifically, this project verified the restriction goes further than just "'edge' is deprecated."** Any `runtime` declaration at all — including the otherwise-default `'nodejs'` — is a hard build error, because Cache Components has already made the choice unconditionally.
- **Proxy's runtime was never a live choice to begin with**, verified as its own distinct error — don't conflate "Edge Runtime is deprecated for routes" with "Proxy used to support Edge and no longer does." The accurate framing: Proxy has *always* defaulted to Node.js in Next.js 16, full stop, and the `runtime` config was never a valid proxy option in the first place (irrespective of Cache Components).
- **Code that broke specifically "because it was on Edge" was almost always a native-Node.js-API dependency issue**, not a language-level incompatibility — useful to know when reading a legacy bug report or an old Stack Overflow answer that blames "the Edge Runtime" vaguely.

## Interview Questions

**Q (High): Why did Next.js middleware historically run almost exclusively on the Edge Runtime, before Node.js became an option?**

Answer: Middleware runs before routing resolves, ideally with minimal cold-start latency and physically close to the request's origin — a full Node.js process is comparatively heavy to start for that purpose, while a V8-isolate-based Edge Runtime can start near-instantly and run distributed across edge locations. Per the version history, middleware shipped on Edge Runtime starting in v12 and stable in v12.2.0; Node.js only became available for middleware in v15.2.0 (experimental) and v15.5.0 (stable) — for roughly three years, Edge wasn't just the default, it was effectively the only choice.

The trap: describing the Edge/Node choice as if it were always a live, symmetric option throughout Next.js's history — for a long stretch it genuinely wasn't.

**Q (High): What specific capabilities did the Edge Runtime lack compared to the Node.js runtime, and why did that matter in practice?**

Answer: No native Node.js APIs (no filesystem access, no Node-specific `node_modules` bindings), no support for Incremental Static Regeneration, and disabled dynamic code evaluation (`eval`, `new Function`, WebAssembly's `compile`/`instantiate`). In practice, this most commonly surfaced as a `node_modules` dependency that quietly relied on a native Node.js API internally, working fine in a normal server-rendered route but failing confusingly once used inside Edge-configured middleware.

The trap: describing the restriction vaguely as "Edge is more limited" without being able to name the concrete capability gaps that actually caused real bugs.

**Q (Medium): Is `export const runtime = 'edge'` still usable in a Next.js 16 project, or does it fail?**

Answer: It depends on the project's configuration. The `runtime` segment config docs call it deprecated and instruct removing it, which by itself suggests a soft, non-breaking deprecation. But under Cache Components (`cacheComponents: true`), it's not soft at all — verified directly, setting `runtime` to any value, including the non-deprecated `'nodejs'`, produces a hard build error, because Cache Components has already made the runtime choice unconditional and rejects the segment config outright rather than silently ignoring it.

The trap: assuming "deprecated" uniformly means "still works, just discouraged" — the actual behavior depends on whether Cache Components is enabled, and this project's own build demonstrates the stricter, error-throwing case.

**Q (Medium): Does Proxy's Node.js-only runtime in Next.js 16 represent Proxy losing Edge Runtime support it used to have?**

Answer: Not quite — the more precise framing, verified directly against a real build error ("Proxy always runs on Node.js runtime"), is that Proxy's runtime was never a configurable choice via the `runtime` segment config to begin with; Next.js 16 simply made Node.js the sole, non-optional runtime for Proxy specifically. This is a related but distinct fact from routes' `runtime = 'edge'` being deprecated — one is about an option being removed from routes, the other is about Proxy never having exposed that option as user-configurable in the first place.

The trap: conflating "Edge Runtime is deprecated for routes" with "Proxy used to run on Edge and had that taken away" — worth keeping the two facts (and their two distinct, independently-verified error messages) separate.

**Q (Low): Why did the Edge Runtime restrict `eval` and dynamic `Function` construction?**

Answer: These relate to the V8-isolate execution model's constraints around dynamic code evaluation — restricting them (with a narrow `unstable_allowDynamic` glob-based escape hatch for cases the bundler's dead-code-elimination couldn't prove unreachable) was part of keeping the isolate model's guarantees intact. The docs frame this as a real, sharp-edged restriction: code violating it "will throw and cause a runtime error" if actually executed.

The trap: assuming this was an arbitrary security policy unrelated to the runtime's underlying architecture, rather than a consequence of the V8-isolate model itself.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why Edge Runtime existed (cold starts, network position) and name the actual tradeoff it made
- [ ] Can state the historical timeline: Edge-only middleware (v12–v15.2), Node.js added experimentally then stabilized (v15.2–v15.5), Proxy's Node.js-only default (v16)
- [ ] Can name at least three concrete Edge Runtime capability restrictions, not just "it's more limited"
- [ ] Can distinguish the two verified error messages (Cache-Components-vs-runtime on routes, Proxy-never-configurable) and what each specifically means
- [ ] Knows "deprecated" here can mean a hard build error, not just a soft warning, depending on whether Cache Components is enabled

---
*Next: Migrating from Middleware to Proxy — this topic covered the runtime story; the next one covers the rename itself in full — why "Proxy" specifically, the codemod, and the newer capabilities (`waitUntil`, unit testing) that came with the change.*
