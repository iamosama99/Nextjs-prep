# TypeScript Setup & Path Aliases in Next.js

## Quick Reference

| Piece | What it does |
|---|---|
| `compilerOptions.paths` in `tsconfig.json` | Defines `@/*` → resolves both for TypeScript *and* Next's bundler, no separate config |
| `moduleResolution: "bundler"` | Matches how Next's actual bundler resolves modules, not Node's older resolution algorithm |
| `plugins: [{ "name": "next" }]` | Editor-level Next-aware type checking (route prop shapes, etc.) |
| `typedRoutes: true` (stable, top-level in `next.config.ts`) | Compile-time-checked `href`s passed to `next/link` |
| `PageProps<Route>` / `LayoutProps<Route>` / `RouteContext<Route>` | Globally available, auto-generated helpers that type `params`/`searchParams`/parallel-route slots per literal route — no import needed |
| `next-env.d.ts` | Auto-generated ambient types — never hand-edited (Topic 2) |

## Where Does This Run?

Compile-time and editor tooling only — none of this affects the shipped JavaScript. `strict` mode and path aliases are erased before the browser ever sees the code; they exist purely to catch mistakes before runtime.

## What Is This?

Next.js ships first-class TypeScript support: `create-next-app --typescript` scaffolds a `tsconfig.json` already tuned for Next's bundler and file conventions, and both Turbopack and Webpack read that same `tsconfig.json` to resolve path aliases — there's no separate bundler-level alias configuration to maintain, unlike setups where the bundler and the type checker have independent alias configs that can drift out of sync.

> **Check yourself:** If you add a new path alias to `tsconfig.json`, do you need to configure it again anywhere else for imports to actually resolve at build time?

## Why Does It Exist?

React Server Components introduce prop shapes and conventions specific to Next.js — `page.tsx` receives `params` and `searchParams` with particular types, `layout.tsx` receives `children`, metadata exports have a specific expected shape (Phase 8). Plain TypeScript has no idea any of this is special. The `next` TypeScript plugin exists to teach the editor and type checker about these Next-specific contracts, so a mismatched prop on a page component is caught while typing, not at runtime.

Path aliases (`@/components/Button` instead of `../../../components/Button`) exist for the same reason every large codebase adopts them — deeply nested relative imports become unreadable and fragile to file moves — but the fact that Next needs *zero* extra bundler config to support them (compared to some setups) is itself a deliberate design choice: one source of truth (`tsconfig.json`) for both the compiler and the bundler.

## How It Works

A scaffolded `tsconfig.json` looks roughly like:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- **`jsx: "preserve"`** — Next's own transform (via Babel/SWC or Turbopack) handles the actual JSX-to-JS conversion; TypeScript is only asked to type-check, not transform, JSX here.
- **`moduleResolution: "bundler"`** — tells TypeScript to resolve modules the way modern bundlers actually do (matching package `exports` maps, etc.), rather than the older Node-style algorithm, which matters because Next's bundler and the type checker need to agree on what a given import resolves to.
- **`paths: { "@/*": ["./*"] }`** — this single mapping is read by *both* TypeScript (for type checking and editor navigation) and Next's bundler (for actually resolving the import at build time) — no duplicate webpack/Turbopack `resolve.alias` entry needed.
- **`.next/types/**/*.ts`** in `include` — Next generates route-specific type-checking files here so that, for example, a `page.tsx`'s exported props are validated against what Next will actually pass at runtime.

**`typedRoutes: true`**, set as a top-level (no longer `experimental.`, as of the current stable release) option in `next.config.ts`, generates a union type of every valid route in your app, so `<Link href="/wrogn-path">` becomes a compile-time TypeScript error instead of a silent 404 discovered at runtime.

> **Check yourself:** Why does `jsx: "preserve"` make sense in a Next.js project specifically, rather than having TypeScript compile JSX itself?

## Typed Props: `PageProps`, `LayoutProps`, `RouteContext`

`typedRoutes` only validates the *string* passed as an `href` — it says nothing about what a page or layout's own `params`/`searchParams` are typed as. That's a separate, complementary mechanism: running `next dev`, `next build`, or explicitly `next typegen` generates three **globally available** helper types, keyed by the literal route string, with no import required:

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;       // typed as string, inferred from the route literal
  const query = await props.searchParams;    // Record<string, string | string[] | undefined>
  return <h1>{slug}</h1>;
}
```

```tsx
// app/dashboard/layout.tsx  — with app/dashboard/@analytics also on disk
export default function Layout(props: LayoutProps<'/dashboard'>) {
  return (
    <>
      {props.children}
      {props.analytics} {/* typed automatically from the @analytics folder — Phase 2, Topic 7 */}
    </>
  );
}
```

Passing the route as a string literal (`'/blog/[slug]'`) is what gives you autocomplete and a strictly-keyed `params` object — a static route resolves `params` to `{}`. `RouteContext<Route>` is the equivalent helper for Route Handlers (Phase 6). Manually writing out `{ params: Promise<{ slug: string }> }` yourself, as earlier Next.js versions required and as you'll still see throughout the ecosystem, still works — these helpers just generate that same shape for you, correctly, from the actual folder structure, so a route rename can't silently desync the type from reality the way a hand-written one can.

> **Check yourself:** If `PageProps` and `typedRoutes` are both "route type safety" features, what specifically does each one actually check, and why doesn't either one make the other redundant?

## Gotchas

- **Changing `moduleResolution` away from `"bundler"`** to satisfy an unrelated library's setup instructions can silently desync what TypeScript thinks resolves from what Next's bundler actually resolves, producing "works at runtime, red squiggly in editor" (or worse, the reverse) confusion.
- **Deep relative imports (`../../../../`) still work** even with aliases configured — nothing forces consistency, so a codebase can end up with both styles mixed unless enforced by lint rules.
- **`typedRoutes` requires the route to already exist on disk** at type-check time — dynamically constructed hrefs (built from a string at runtime) won't get the same compile-time guarantee.
- **`PageProps`/`LayoutProps` types go stale until you regenerate them.** They're written to `.next/types/` by `next dev`, `next build`, or `next typegen` — if you add a new dynamic segment and your editor is showing an outdated type error, running one of those (or just letting `next dev` pick up the change) is the fix, not fighting the type system.

## Interview Questions

**Q (High): How do path aliases like `@/components` actually resolve in a Next.js app — is there separate bundler configuration beyond `tsconfig.json`?**

Answer: No separate configuration is needed. The `paths` mapping in `tsconfig.json` is read directly by Next's bundler (Turbopack or Webpack) to resolve the alias at build time, and by TypeScript for type checking and editor tooling — one source of truth for both.

The trap: describing it as if you need to mirror the alias in a webpack config, which is how many non-Next setups work and is a common assumption to carry over incorrectly.

**Q (Medium): What does the `next` TypeScript plugin actually provide that stock TypeScript wouldn't?**

Answer: Next-aware type checking for framework-specific contracts — validating that a `page.tsx`'s props match what Next will actually pass (`params`, `searchParams`), and surfacing errors for misuse of conventions the compiler alone has no knowledge of. It's editor/compiler tooling, not a runtime library.

The trap: conflating it with ESLint's `eslint-config-next`, which is a separate, lint-rule-based mechanism.

**Q (Medium): What is `typedRoutes`, and what class of bug does it prevent?**

Answer: It generates a compile-time union type of every valid route in the app and type-checks `href` values passed to `next/link` (and the router) against it, turning a typo'd or stale route path into a build-time TypeScript error instead of a runtime 404. It's a stable, top-level `next.config.ts` option now (previously `experimental.typedRoutes` in older versions).

The trap: not knowing this exists, assuming Next.js validates route strings by default without opting in, or citing it as still experimental.

**Q (Medium): What do `PageProps` and `LayoutProps` give you that manually writing `{ params: Promise<{ slug: string }> }` doesn't, and how are they different from `typedRoutes`?**

Answer: `PageProps<Route>`/`LayoutProps<Route>` are globally available helper types, generated from the actual route folder structure during `next dev`/`next build`/`next typegen`, that give you a correctly-typed `params`, `searchParams`, and (for layouts) parallel-route slots for a given literal route — with no manual typing and no risk of the type silently drifting from reality after a route is renamed. `typedRoutes` is a separate, complementary feature: it only validates that a string passed as `href` corresponds to a real route; it says nothing about what that route's own `params` are shaped like. Neither makes the other redundant — one checks the destination string is valid, the other checks what you receive once you're there.

The trap: conflating the two as "the same typed-routes feature," or assuming one implies the other is unnecessary.

**Q (Low): Why is `next-env.d.ts` listed in `tsconfig.json`'s `include`, and why shouldn't you remove it?**

Answer: It's the file that pulls in Next's ambient TypeScript types (JSX intrinsics, image imports, etc.). Removing it from `include`, or deleting the file, breaks type checking for Next-specific globals even though the file's own content is auto-managed and mostly empty-looking.

The trap: seeing a nearly-empty auto-generated file and assuming it's safe to delete because "it doesn't do anything."

---

## Self-Assessment

- [ ] Can explain, without notes, why a path alias needs no separate bundler config in Next.js
- [ ] Can state what the `next` TS plugin adds beyond stock TypeScript
- [ ] Can describe what `typedRoutes` catches and its limitation with dynamically built hrefs
- [ ] Can explain what `PageProps`/`LayoutProps` generate and why that's different from `typedRoutes`
- [ ] Knows why `jsx: "preserve"` is the correct setting in this context
- [ ] Would not delete `next-env.d.ts` or remove it from `include`

---
*Next: Environment variables (`.env`, `NEXT_PUBLIC_` prefix) — how Next.js decides what configuration is safe to ship to the browser vs. must stay server-only.*
