# Environment Variables (`.env`, `NEXT_PUBLIC_` Prefix)

> **Live demo:** `npm run dev` → [/playground/phase-01-fundamentals/06-environment-variables](http://localhost:3000/playground/phase-01-fundamentals/06-environment-variables) (copy `.env.example` to `.env.local` first)

## Quick Reference

| Variable name | Accessible where | When its value gets fixed |
|---|---|---|
| `DATABASE_URL` (no prefix) | Server only — Server Components, Route Handlers, Server Actions, `next.config.ts` | Read live from `process.env` on the server at runtime |
| `NEXT_PUBLIC_API_URL` (prefixed) | Server *and* client | Statically inlined into the JS bundle at **build time** |
| `.env.local` | Loaded in all environments, git-ignored by default | — |
| `.env.production` | Loaded only when `NODE_ENV=production` | — |

## Where Does This Run?

This is the entire point of the topic: the *prefix* determines where a variable's value is available, and that in turn determines *when* its value gets fixed — server-only variables are read live from `process.env` at request time on the server (in a Node runtime); `NEXT_PUBLIC_`-prefixed variables are replaced with their literal value directly in the client JavaScript bundle during the build, because client code has no `process.env` to read from at runtime — the browser doesn't have a Node process.

## What Is This?

Next.js loads `.env` files automatically (no `dotenv` package needed) and applies one rule that governs everything else: a variable is available in browser-shipped code **only if its name starts with `NEXT_PUBLIC_`**. Everything else is server-only by default — accessible in Server Components, Route Handlers, Server Actions, Middleware, and `next.config.ts`, but never sent to the client.

> **Check yourself:** You define `API_KEY=secret123` with no prefix and try to read `process.env.API_KEY` inside a Client Component. What do you get?

## Why Does It Exist?

Before this convention, "don't leak secrets to the client" was a discipline problem — nothing stopped a database URL or API key from ending up in client-shipped code except developer vigilance. The `NEXT_PUBLIC_` prefix turns that discipline problem into a naming convention the framework itself enforces: unprefixed variables are structurally excluded from the client bundle, not just conventionally discouraged from being used there. This matters more in App Router, where Server and Client Components live in the same file tree and it's easy to lose track of which boundary a given line of code executes on (Phase 4 covers that boundary in depth).

## How It Works

**Server-only variables** are read directly via `process.env.VAR_NAME` in server-executing code. Because that code genuinely runs in a Node.js process (or the Edge runtime, with caveats — Phase 7) at request time, the value is read live — changing it and restarting the server (or, on most platforms, redeploying) picks up the new value without touching application code.

**`NEXT_PUBLIC_`-prefixed variables** work completely differently under the hood: at build time, Next's bundler performs a literal text substitution — every occurrence of `process.env.NEXT_PUBLIC_API_URL` in code that ends up in the client bundle is replaced with the actual string value, baked directly into the shipped JavaScript. This is why:

```tsx
// This works — the bundler can statically find and replace this exact expression
const url = process.env.NEXT_PUBLIC_API_URL;

// This does NOT get inlined — dynamic access defeats the static replacement
const key = `NEXT_PUBLIC_${someVariable}`;
const url = process.env[key];
```

**Load order / precedence** (later files override earlier ones for the same key): `.env` → `.env.local` (skipped in test environment) → `.env.[environment]` (`.env.development` / `.env.production`) → `.env.[environment].local`. `.env.local` is meant for personal, git-ignored secrets and overrides; `.env` for defaults safe to commit (or as a template).

> **Check yourself:** Why does `process.env[dynamicKey]` fail to expose a `NEXT_PUBLIC_` variable to the client, even though the exact same expression works fine on the server?

## Gotchas

- **Forgetting the `NEXT_PUBLIC_` prefix** is the single most common bug here — the variable silently comes back `undefined` in a Client Component, with no error, because it was simply never included in the bundle. This is by design, not a bug to work around.
- **Accidentally prefixing a secret with `NEXT_PUBLIC_`** — e.g., `NEXT_PUBLIC_DATABASE_URL` — ships it directly into the client bundle, readable by anyone who opens dev tools. This is a genuine security incident, not a style nit, and code review should treat any new `NEXT_PUBLIC_` variable as worth double-checking (Phase 12 revisits this in the context of server-only secrets more broadly).
- **`NEXT_PUBLIC_` values are frozen at build time**, not read live even on the server. Changing one in your hosting platform's dashboard without triggering a rebuild does nothing — this trips people up because server-only variables in the *same file* behave completely differently (live) right next to them.
- **`.env.local` is skipped when `NODE_ENV=test`**, which surprises people running tests locally who expect their usual local overrides to apply.

## Interview Questions

**Q (High): What does the `NEXT_PUBLIC_` prefix actually do, mechanically — not just "makes it public"?**

Answer: At build time, Next's bundler performs a static find-and-replace: every literal `process.env.NEXT_PUBLIC_X` expression in code destined for the client bundle is substituted with the variable's actual string value, baked directly into the shipped JavaScript. It is not read live from a runtime environment in the browser — the browser has no `process.env` at all. Unprefixed variables simply never go through this substitution and are excluded from the client build entirely.

The trap: describing it as some kind of runtime access-control check ("the client is *allowed* to read it") rather than a static, build-time bundling mechanism.

**Q (High): If a database password gets accidentally prefixed with `NEXT_PUBLIC_`, what actually happens, and how would you catch it before it ships?**

Answer: The value gets inlined into the client JavaScript bundle at build time and is trivially visible to anyone who inspects the shipped code or network responses — a real credential leak, not a theoretical one. Catching it requires either a code-review convention of scrutinizing any new `NEXT_PUBLIC_`-prefixed variable, or a lint/CI check (some teams grep build output or CI-gate on a denylist of sensitive variable name patterns) rather than relying purely on developer memory.

The trap: treating this as a hypothetical rather than describing concretely how it manifests and how you'd actually prevent or detect it in a real pipeline.

**Q (Medium): Are server-only environment variables read at build time or request time?**

Answer: Request time (live) — `process.env` is read fresh by the running Node.js process each time server code executes, so updating a server-only variable and restarting/redeploying the process (without necessarily rebuilding the application) picks up the new value, in contrast to `NEXT_PUBLIC_` variables which are frozen into the bundle at build time.

The trap: assuming all environment variables behave the same way regardless of prefix — the prefix changes not just *where* a variable is available but *when* its value is fixed.

**Q (Medium): What's the precedence order among `.env`, `.env.local`, and `.env.production`, and what's each meant for?**

Answer: Load order (later overrides earlier, for the same key) is `.env` → `.env.local` → `.env.[NODE_ENV]` → `.env.[NODE_ENV].local`. `.env` holds defaults safe to commit; `.env.local` holds personal, git-ignored overrides and secrets and is loaded in all environments except test; `.env.production`/`.env.development` hold environment-specific values.

The trap: not knowing `.env.local` is intentionally skipped in the test environment, which explains otherwise-confusing "works when I run it normally, fails in tests" reports.

**Q (Low): Can `next.config.ts` read environment variables directly, and does the `NEXT_PUBLIC_` rule apply there?**

Answer: Yes — `next.config.ts` runs in Node.js at build/startup, so it can read any `process.env` variable directly, prefixed or not; the `NEXT_PUBLIC_` convention is about what gets inlined into the *client bundle*, which is a separate concern from what the config file itself can read.

The trap: assuming the prefix rule is a blanket access-control rule everywhere in the project rather than specifically about client-bundle inclusion.

---

## Self-Assessment

- [ ] Can explain the build-time-inlining mechanism behind `NEXT_PUBLIC_`, not just "it's exposed to the client"
- [ ] Can describe concretely what happens if a secret gets the `NEXT_PUBLIC_` prefix by mistake, and how to catch it
- [ ] Knows server-only vars are read live at request time; `NEXT_PUBLIC_` vars are frozen at build time
- [ ] Can state the `.env` file precedence order from memory
- [ ] Knows `.env.local` is skipped under `NODE_ENV=test`

---
*Next: Static assets & the `public/` folder — the other way to expose something to the browser, with a completely different set of rules from environment variables.*
