# The Client Component Boundary in Practice

**Demo:** `app/playground/phase-04-server-components-data/02-use-client-boundary` — run `npm run dev`, visit `/playground/phase-04-server-components-data/02-use-client-boundary`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `'use client'` at the top of a file, before imports | Marks an **entry point** into the client module graph | Not "run this component on the client" — see How It Works |
| A component imported by a `'use client'` file | Pulled into the client bundle, even with no directive of its own | You only need the directive at entry points, not every file |
| A Server Component passed as `children`/a prop to a Client Component | **Not** pulled into the client bundle | Code crosses via imports; rendered output crosses via props — different rules |
| A compiler error pointing at a specific import | Server-only code entered the client graph with no boundary | The fix is almost always adding `'use client'` at the right entry point, not everywhere |

## Where Does This Run?

This topic is about the mechanics of the boundary itself — the compiler-level rule that decides which module ends up in the client bundle, independent of where any single component's *output* happens to render.

## What Is This?

Topic 1 established that Client Components run in both places (server, for initial HTML, and browser, for interactivity). `'use client'` is the directive that makes that possible — but what it actually does is narrower and more mechanical than "this file is client code." It marks **one entry point** into the client module graph. Everything that file imports, and every component it renders directly, gets swept into the client bundle with it — but you don't need to (and shouldn't) sprinkle the directive across every file in a client-heavy subtree.

```tsx
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

> **Check yourself:** Without looking, explain in one sentence why a component imported by a `'use client'` file doesn't need its own `'use client'` directive.

## Why Does It Exist?

A bundler has no way to infer, from code alone, whether a given function is "meant for" the server or the browser — `useState` is a dead giveaway, but plenty of ordinary-looking code could run in either place. `'use client'` exists to make that decision explicit and intentional, at the one place it actually needs deciding: the boundary itself. Requiring the directive on *every* file that happens to be part of a client subtree would be redundant noise; requiring it *nowhere* would leave the compiler guessing.

## How It Works

### Two different rules for two different things crossing the boundary

- **Code crosses through imports.** Whatever a Client Component's file imports is pulled into the client bundle — transitively, following the whole import chain.
- **Data crosses through props**, and only if it's serializable (Topic 8 covers this fully). Rendered React elements — including a whole Server Component's *output* — count as serializable data for this purpose, which is exactly why the `children`/slot pattern works (Topic 3).

This is why "Server Components passed as children" don't get pulled into the client bundle even though they end up visually nested inside a Client Component: their *code* was never imported by the Client Component's file. Only their already-rendered *output* crossed, as a prop.

### You only need the directive at the entry, not throughout

```
app/ui/interactive-panel.tsx   'use client'   ← the entry point
  └─ imports app/ui/icon.tsx                   ← no directive needed, pulled in anyway
  └─ imports app/ui/tooltip.tsx                ← same
```

`Icon` and `Tooltip` don't need `'use client'` themselves — being imported by a file that has it is sufficient to place them in the client graph. Adding the directive to every file "just in case" is unnecessary and, in a large codebase, actively misleading about where the real boundary is.

### The wrapper pattern: keep shared modules unchanged

If a component is genuinely shared between server and client contexts, or you don't want to touch its source, create a thin Client Component wrapper that imports it and put the directive on the *wrapper* instead:

```tsx
// shared-widget.tsx — untouched, no directive
export function SharedWidget() { /* uses useState internally */ }
```

```tsx
// shared-widget-client.tsx — the actual boundary
'use client'
export { SharedWidget } from './shared-widget'
```

This is precisely the pattern Topic 9 uses for wrapping third-party libraries that don't ship their own `'use client'` directive.

### When you forget the boundary: the compiler tells you where

If client-only code (a hook, an event handler) ends up reachable from the server graph with no `'use client'` anywhere in its import chain, the build fails and points at the exact import that needs the boundary. This is a genuinely helpful failure mode — worth deliberately triggering once (this topic's demo does) so you recognize the error message instantly rather than guessing at it under time pressure.

## Gotchas

- **Compound components can break silently across the boundary.** A pattern like `Menu.Item` or `Tabs.Panel` — a component exposing sub-components as static properties — works fine when every piece lives in the same graph (all server, or all client). It breaks when a Server Component imports a Client compound component: the Server Component receives a client *reference* rather than the actual function object, so `Menu.Item` is `undefined` on that reference, and React throws "Element type is invalid" — a confusing error that doesn't obviously point back to "boundary crossed a static property." The fix is exposing pieces as named exports instead of static properties when they need to be reachable from a Server Component, or only ever consuming the compound component from within another Client Component.
- **Owner and parent aren't the same thing, and this matters for what actually crosses.** In `<Modal><Cart /></Modal>`, the page that writes `<Cart />` in JSX is `Cart`'s *owner*; `Modal` is only its rendered *parent*. Because `Cart`'s owner is a Server Component, `Cart` renders on the server regardless of who its rendered parent is — `Modal` receives Cart's already-rendered output, never its code. (Topic 3 goes deeper on this composition pattern.)
- **Passing a function as a prop from a Server to a Client Component throws** — event handlers can't cross, since they're not serializable. A `'use server'`-marked Server Function is the one exception: it crosses as a reference, not as a plain function (this is what makes Server Actions passable as props at all — Phase 5).

## Interview Questions

**Q (High): A file has `'use client'` at the top and imports three other components, none of which have the directive themselves. Are those three components part of the client bundle?**

Answer: Yes — `'use client'` marks the file as an entry point into the client module graph, and everything that file imports is pulled into the client bundle transitively, regardless of whether each imported file has its own directive. You only need `'use client'` once, at the entry point; adding it to every downstream file is redundant.

The trap: assuming every file that ends up in the client bundle needs its own explicit directive — the rule is about the *entry*, not every participant.

**Q (High): You have `<ClientModal><ServerCart /></ClientModal>` where `ServerCart` is a genuine Server Component. Does `ServerCart`'s code end up in the client bundle?**

Answer: No. Code crosses the boundary through imports; `ClientModal`'s file never imports `ServerCart` — it only receives `ServerCart`'s already-rendered output as its `children` prop, which is serializable data, not code. `ServerCart` still renders exclusively on the server; `ClientModal` just places that rendered output somewhere in its own output.

The trap: assuming anything visually nested inside a Client Component must itself be a Client Component, or must be bundled for the client — nesting in the rendered tree and being part of the same module graph are unrelated facts.

**Q (Medium): A Server Component imports a Client Component that exposes `Menu.Item` as a static property. What happens when the Server Component tries to render `<Menu.Item>`?**

Answer: It throws "Element type is invalid" (or similar) at runtime, because the Server Component received a client *reference* to `Menu`, not the actual function object — client references don't carry arbitrary static properties the way real functions do, so `Menu.Item` is `undefined` on that reference. The fix is exposing `Item` as its own named export from the Client Component's module (so it can be imported directly) rather than relying on it being reachable as a property of `Menu` from across the boundary.

The trap: not recognizing this failure mode by name — it's a specific, well-documented gotcha of compound components crossing the server/client boundary, not a generic "something's wrong with my Client Component" bug.

**Q (Medium): Why would you create a Client Component "wrapper" file instead of just adding `'use client'` directly to a shared component's own file?**

Answer: Adding the directive directly to a shared component's file forces it into the client graph unconditionally, for every consumer — including ones that only wanted to use it from a Server Component context. A thin wrapper file that imports and re-exports the shared component, with `'use client'` on the wrapper instead, puts the boundary at the point of actual client usage without modifying the shared module itself, so the same underlying component stays reusable from wherever it's genuinely needed.

The trap: not distinguishing "this component needs client capabilities when used a certain way" from "this component must always be client-only" — the wrapper pattern exists precisely to avoid over-committing a shared module to one environment.

**Q (Low): Can you pass a plain JavaScript function (not a Server Function) as a prop from a Server Component to a Client Component?**

Answer: No — it throws. Plain functions aren't serializable, and only serializable data can cross via props (Topic 8). The one exception is a function explicitly marked `'use server'` (a Server Function), which crosses as a special reference the client can invoke, rather than as ordinary function data.

The trap: conflating "any function" with "Server Functions specifically" — the exception is narrow and requires the explicit directive, not just "the function happens to only do server-safe things."

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why only the entry-point file needs `'use client'`, not every downstream component
- [ ] Can explain why a Server Component passed as `children` to a Client Component doesn't join the client bundle
- [ ] Can explain the compound-component gotcha (`Menu.Item` becoming `undefined`) and its fix
- [ ] Can explain why a Client Component wrapper is sometimes preferable to adding the directive directly
- [ ] Can explain why plain functions can't cross from Server to Client Components as props

---
*Next: Composing server & client components — the `children`-as-slot pattern this topic previewed, the owner/parent distinction in full, and how React Context fits (or doesn't) into a Server Component tree.*
