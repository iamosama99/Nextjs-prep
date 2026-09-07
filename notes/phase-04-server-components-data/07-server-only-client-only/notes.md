# `server-only` / `client-only` Packages

**Demo:** `app/playground/phase-04-server-components-data/07-server-only-client-only` — run `npm run dev`, visit `/playground/phase-04-server-components-data/07-server-only-client-only`. `secrets.ts` has an exercise: try importing it into a Client Component and run `npm run build` to see the enforcement fire for real.

## Quick Reference

| You write | What it actually does | Why it matters |
|---|---|---|
| `import 'server-only'` at the top of a module | Throws a **build-time** error if that module ever ends up in the client graph | Turns "this must never reach the browser" into an enforced guarantee, not a hoped-for discipline |
| `import 'client-only'` | The reverse — errors if the module is pulled into the *server* graph | For code that assumes `window`/`document` exist |
| `NEXT_PUBLIC_`-prefixed env vars | The only ones that reach the client bundle | Everything else is replaced with an empty string client-side — silently, not with an error |
| Installing these packages via npm | Optional | Next.js handles the imports internally regardless; installing them only matters if your linter flags unresolved/extraneous imports |

## Where Does This Run?

Build-time enforcement, at the module-resolution step — not a runtime check. The whole point is catching the mistake before any code ships, not detecting it after a secret has already leaked.

## What Is This?

Topic 1's gotcha flagged this risk already: a module can be shared between server and client module graphs, so it's genuinely possible to accidentally import server-only code — a function reading `process.env.API_KEY`, a database client — into a file that ends up in the client bundle. Without the `NEXT_PUBLIC_` prefix, that specific env var read *silently becomes an empty string* in the browser rather than erroring — which means the bug doesn't announce itself. `server-only` (and its counterpart `client-only`) close this gap: importing the package at the top of a module makes that module throw a **build error** the moment anything pulls it into the wrong graph, rather than quietly producing broken behavior at runtime.

```ts
// lib/data.ts
import 'server-only'

export async function getData() {
  const res = await fetch('https://external-service.com/data', {
    headers: { authorization: process.env.API_KEY },
  })
  return res.json()
}
```

> **Check yourself:** Without looking, explain what actually happens — silently or loudly — if a function reading an unprefixed `process.env` secret is imported into a Client Component *without* `server-only` protecting it.

## Why Does It Exist?

"Only `NEXT_PUBLIC_`-prefixed variables reach the client" is true, but it's not, by itself, a strong enough guarantee for a whole codebase. It means the *specific secret value* doesn't leak — but the function that was supposed to read it still gets bundled, still gets called, and now silently returns wrong/empty results in the browser instead of the loud, obvious failure you'd actually want. `server-only` moves the failure earlier and makes it impossible to miss: a build error naming the exact offending import, at compile time, instead of a support ticket about a broken feature discovered in production.

## How It Works

### One line, following the whole import chain

Add the import once, at the top of the module containing genuinely server-only logic:

```ts
import 'server-only'
export async function getData() { /* ... */ }
```

Now, if *anything* in the client module graph imports this file — directly, or transitively through some other file that imports it — the build fails with a clear error pointing at the offending import. This follows Topic 2's import-crossing rule exactly: code crosses via imports, so `server-only` is really asserting "this module must never be part of an import chain that crosses into the client graph," and Next.js enforces that assertion at compile time.

`client-only` is the mirror image, for modules that assume browser-only globals (`window`, `document`, `localStorage`) are available — importing it into a module that ends up in the *server* graph produces the equivalent error in the other direction.

### Next.js provides its own handling, not the npm packages' actual code

Installing `server-only`/`client-only` from npm is **optional** — Next.js recognizes and handles these specific import specifiers internally, producing its own clearer error messages, regardless of whether the packages are actually present in `node_modules`. The real npm packages' contents aren't what does the enforcement; installing them is only relevant if your linting setup flags an import with no corresponding installed dependency. Next.js also ships its own TypeScript type declarations for these two specifiers, which matters specifically for projects with `noUncheckedSideEffectImports` enabled in `tsconfig.json`.

## Gotchas

- **`server-only` protects the *module*, not the *data* once it leaves that module.** If a Server Component correctly imports a `server-only`-protected function, gets a result back, and then passes that result — including fields nobody meant to expose — to a Client Component as a prop, `server-only` did its job perfectly and the data still leaked. Preventing *that* is Topic 8's territory (serialization discipline, DTOs, tainting), a genuinely separate concern from preventing the wrong *code* from being bundled.
- **The failure without `server-only` is silent, which is precisely the danger.** An unprotected secret-reading function imported into a Client Component doesn't error — it bundles fine, runs in the browser, and the unprefixed env var read simply evaluates to an empty string there. The bug surfaces as "this feature doesn't work" or, worse, "this feature works with server-side data during the initial render and breaks after client-side navigation" — not as an obvious crash.
- **One `server-only` import can "poison" (correctly) a widely-shared utility file.** If a shared `utils.ts` imports a `server-only`-protected helper for one function among many, the *entire* `utils.ts` module becomes off-limits to the client graph — every other, otherwise-innocent export in that file becomes unreachable from Client Components too, since the import-following is whole-module, not per-export. This is usually the correct outcome (better to over-restrict than leak a secret), but it can require splitting a shared file if some of its exports genuinely need to be client-reachable.

## Interview Questions

**Q (High): What specifically does `import 'server-only'` prevent, and what does it not prevent?**

Answer: It prevents the *module* it's placed in from being successfully bundled into client-side JavaScript — any attempt to import that module (directly or transitively) from a file that's part of the client graph fails the build with a clear error. It does **not** prevent sensitive *data* that module produces from being passed onward to a Client Component as a prop once a Server Component has legitimately called it — `server-only` is a code-location guarantee, not a data-shaping one. Those are separate problems solved by separate tools (server-only for code, DTOs/tainting for data — Topic 8).

The trap: treating `server-only` as a general "this data is safe" guarantee rather than specifically "this code never ships to the browser" — a function can be perfectly protected by `server-only` and still leak its return value if a component isn't careful about what it passes downstream.

**Q (High): A function reads `process.env.SECRET_KEY` (no `NEXT_PUBLIC_` prefix) with no `server-only` protection, and it gets imported into a Client Component. What actually happens — does the build fail?**

Answer: No — the build succeeds. The function gets bundled into client JavaScript, ships to the browser, and runs there; the `process.env.SECRET_KEY` read simply evaluates to an empty string in that context, since Next.js replaces unprefixed env vars with an empty string client-side rather than leaving the actual secret in the bundle (which would be a much worse, real leak). The result is a silent functional bug — the feature relying on that secret quietly breaks in the browser — not a loud failure. `server-only` is precisely what converts this into a build-time error instead.

The trap: assuming the absence of `NEXT_PUBLIC_` is itself sufficient protection — it prevents the *secret value* from leaking, but says nothing about whether the surrounding code should have been client-reachable at all, and the resulting bug is genuinely harder to notice than a loud crash.

**Q (Medium): Do you need to run `npm install server-only` for the directive to actually work?**

Answer: No — Next.js recognizes and enforces the `server-only`/`client-only` import specifiers internally, independent of whether the actual npm packages are installed; their real published contents aren't what performs the enforcement. Installing them is only relevant for tooling reasons, such as a linter flagging an import that has no corresponding entry in `package.json`.

The trap: assuming this is an ordinary third-party library whose logic does the work — it's closer to a magic string Next.js's compiler specifically recognizes, with the npm packages existing mainly for ecosystem/tooling compatibility.

**Q (Medium): A shared `lib/utils.ts` file exports ten unrelated helper functions. One of them reads a database directly and gets `server-only` added to the top of the file. What happens to the other nine exports from a Client Component's perspective?**

Answer: All ten become unreachable from the client graph — `server-only` operates at the module level, so importing the file at all (regardless of which specific export is used) fails the build once any part of that import chain crosses into client code. If some of the other nine genuinely need to be usable from Client Components, the fix is splitting the file so the database-reading function lives in its own `server-only`-protected module, leaving the client-safe helpers in a file without that restriction.

The trap: assuming `server-only` can be scoped to a single export within a file — it can't; the protection is whole-module, which sometimes forces a refactor purely to un-poison unrelated exports.

**Q (Low): What's the mirror-image use case for `client-only`, as opposed to `server-only`?**

Answer: `client-only` protects a module that assumes browser-only globals are available (`window`, `document`, `localStorage`, `navigator`) — importing it into the *server* module graph (where those globals don't exist) fails the build instead of throwing a confusing runtime `ReferenceError` the first time that code actually executes during a server render.

The trap: not recognizing this as a real, separate use case — it's easy to only remember `server-only` since secret-leakage is the more dramatic failure mode, but browser-API assumptions breaking server rendering is a common real bug too.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what `server-only` prevents and, just as importantly, what it doesn't prevent
- [ ] Can explain what happens (silently) to an unprotected secret-reading function imported into a Client Component
- [ ] Can explain why installing the npm packages is optional
- [ ] Can explain why `server-only` on one export in a shared file affects every export in that file
- [ ] Can name the mirror-image use case for `client-only`

---
*Next: Passing data across the server/client boundary — now that you know how to stop the wrong *code* from crossing, the next question is what actually governs whether *data* is allowed to cross, and how much of it should.*
