# Composing Server & Client Components

**Demo:** `app/playground/phase-04-server-components-data/03-composing-server-client` — run `npm run dev`, visit `/playground/phase-04-server-components-data/03-composing-server-client`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `<ClientModal><ServerCart /></ClientModal>` | A Server Component rendered *inside* a Client Component's output | `ServerCart`'s code never joins the client bundle — only its rendered output does |
| **Owner** | The component whose JSX literally contains a given child | Determines *where the child renders* (server, if the owner is a Server Component) |
| **Parent** | The component that directly contains the child in the *rendered* tree | Can differ from the owner once `children`/props are involved |
| A Client Component wrapping `createContext`/`useContext` | The only way to use React Context in an RSC tree | Context itself is unsupported directly inside Server Components |

## Where Does This Run?

This is squarely about composition, not a new execution environment: every piece here still runs exactly where Topics 1–2 say it does (Server Components on the server only, Client Components in both places). What's new is the *pattern* for wiring them together when one needs the other's capabilities.

## What Is This?

A common, real shape: you need client-side interactivity (a modal's open/closed state) *around* content that should stay server-rendered (a cart fetched from a database). Making the modal a Client Component is easy — but if you naively `import Cart from './cart'` inside that Client Component's file, Topic 2's import rule pulls `Cart`'s code into the client bundle, defeating the point of keeping it server-only. The fix is `children` (or any prop) as a **slot**: pass the Server Component's already-rendered *output* into the Client Component, rather than importing its code.

```tsx
// modal.tsx — Client Component
'use client'
export default function Modal({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
```

```tsx
// page.tsx — Server Component
import Modal from './ui/modal'
import Cart from './ui/cart'

export default function Page() {
  return (
    <Modal>
      <Cart />
    </Modal>
  )
}
```

`Modal` never imports `Cart`. `Page` does — and `Page` is a Server Component, so `Cart` renders on the server, its rendered output becomes part of the RSC Payload, and `Modal` (client-side) just places that already-finished output wherever `{children}` sits in its own markup.

> **Check yourself:** Without looking, explain why this pattern would stop working if `Modal`'s file added `import Cart from './cart'` directly, even if `Modal` still only ever placed `<Cart />` via the `children` prop as before.

## Why Does It Exist?

Without this pattern, you'd face a false choice: either make the whole subtree (modal *and* its server-fetched content) a Client Component — shipping data-fetching logic and secrets-adjacent code to the browser unnecessarily — or fetch the cart's data client-side after the modal opens, adding a round trip and losing the "fetch close to the source" benefit Topic 1 covered. `children`-as-slot lets the interactive shell and the server-rendered content each stay in the environment that actually suits them.

## How It Works

### Owner vs. parent: two different questions

React distinguishes **owner** (whose JSX source contains a child) from **parent** (what directly contains that child in the *rendered* tree). In `<Modal><Cart /></Modal>` written inside `Page`, `Page` is the owner of both `Modal` and `Cart` — its source literally has both in it. `Modal` is only `Cart`'s rendered *parent*, since `Cart`'s element ends up nested inside `Modal`'s output once rendered.

This distinction is what makes the whole pattern work: **where a component renders is determined by its owner, not its rendered parent.** `Cart`'s owner (`Page`) is a Server Component, so `Cart` renders on the server — completely independent of the fact that its rendered *parent* (`Modal`) is a Client Component. This is exactly why a Client Component can visually "contain" server-rendered content without ever running that content's code itself.

### Multiple named slots, not just `children`

`children` is the most common slot, but any prop can serve the same role — a Client Component can accept several named slots at once:

```tsx
'use client'
export function Modal({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div role="dialog">
      <header>{title}<button onClick={() => setOpen(false)}>Close</button></header>
      {children}
    </div>
  )
}
```

```tsx
// Server Component
<Modal title={<div>Your cart</div>}>
  <Cart />
</Modal>
```

Both `title` and `children` are rendered React elements — serializable data (Topic 2's second crossing rule) — passed as ordinary props, each rendered on the server by virtue of their owner (`Page`) being a Server Component.

### React Context needs a Client Component wrapper

React Context (`createContext`/`useContext`) isn't supported directly inside Server Components — there's no persistent client-side instance for a Server Component to subscribe a context consumer to. The fix is the same slot pattern, applied to an entire subtree: wrap `children` in a Client Component that owns the `Context.Provider`.

```tsx
'use client'
import { createContext } from 'react'
export const ThemeContext = createContext({})
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
```

```tsx
// app/layout.tsx — Server Component
import ThemeProvider from './theme-provider'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body><ThemeProvider>{children}</ThemeProvider></body></html>
  )
}
```

The root layout renders `ThemeProvider` directly (it's just a component, server-renderable like any other), and everything passed as its `children` — the rest of your Server-Component-rendered app — is still eligible to be server-rendered, since `ThemeProvider` only wraps it as a slot rather than importing its code.

**Placement depth matters.** Render providers as deep in the tree as the data they carry actually requires, not wrapping the entire `<html>` document by habit — `ThemeProvider` wrapping only `{children}` (not `<html>`/`<head>`) keeps more of the surrounding static structure eligible for Next.js's own optimization, rather than needlessly nesting everything under a client boundary that doesn't need to be that wide.

### Passing server-fetched data *through* a provider

Combine this with React's `use()` API to stream server-fetched data into a context that any downstream Client Component can read, without every consumer needing its own prop drilled down manually: start the fetch in a Server Component *without awaiting it*, pass the pending `Promise` into a Client Component provider, and let consumers call `use()` on it from context.

```tsx
// Server Component — do NOT await
let userPromise = getUser()
return <UserProvider userPromise={userPromise}>{children}</UserProvider>
```

The provider forwards the promise through context; any Client Component under it can `use()` the same promise, suspending until it resolves. If several components need the same underlying data, wrap the fetch in `React.cache` (Topic 5) first so they share one call instead of independently re-triggering it.

## Gotchas

- **Adding a direct import breaks the pattern, even if you keep using `children`.** If `Modal`'s file adds `import Cart from './cart'` for any reason (even unrelated to how it's rendered), Topic 2's import rule pulls `Cart`'s code into the client bundle regardless of whether `Modal` still receives `<Cart />` via `children` elsewhere — the import rule doesn't care how the imported thing is eventually used.
- **A provider wrapped too high in the tree costs more than it looks like.** Every Server Component nested under a Client Component provider is still server-rendered correctly (owner-based rendering doesn't change), but wrapping the entire document unnecessarily widens the boundary Next.js has to reason about for static optimization, for no benefit if the context's data isn't actually needed that high up.
- **`use()` reading a promise from context has real caveats** — re-fetching a promise set high in the tree re-runs the Server Component that created it. For data only part of the app needs, place the provider on that specific subtree instead of the root layout, not out of a "narrower scope is cleaner" instinct but because it avoids unnecessary re-renders of the promise-producing Server Component.

## Interview Questions

**Q (High): `<Modal><Cart /></Modal>` is written inside a Server Component page. `Modal` is `'use client'`. Does `Cart`'s code end up in the client bundle? What determines the answer?**

Answer: No. The determining factor is `Cart`'s *owner* — the component whose JSX source contains it — which is the Server Component page, not `Modal`. Since `Cart`'s owner is a Server Component, `Cart` renders on the server regardless of the fact that its rendered *parent* in the final tree is `Modal`, a Client Component. `Modal` never imports `Cart`'s code; it only receives Cart's already-rendered output as its `children` prop.

The trap: assuming anything visually "inside" a Client Component in the rendered output must be part of the client bundle — ownership (source-level nesting), not rendered-tree nesting, is what determines where code executes.

**Q (High): Why can't you use `createContext`/`useContext` directly inside a Server Component, and what's the standard fix?**

Answer: Context relies on a persistent, subscribable instance that consumers read from and re-render in response to — a mechanism that doesn't exist for Server Components, whose code doesn't have an ongoing client-side presence to subscribe anything to. The fix is a Client Component wrapper: a `'use client'` component that owns the `Context.Provider` and accepts `children` as a slot, letting a Server Component (like the root layout) render the provider around the rest of the (still server-renderable) app.

The trap: trying to "make the whole app a Client Component" to get Context working — the slot pattern lets you keep the vast majority of the tree server-rendered while still providing context to whichever Client Components actually need to consume it.

**Q (Medium): Why does Next.js recommend placing context providers "as deep as possible" in the tree rather than wrapping the entire `<html>` document?**

Answer: A provider's `children` slot still renders whatever's passed to it correctly regardless of placement — server-rendering isn't broken by placing the provider high. But wrapping more of the document than necessary widens the portion of the tree nested under a Client Component boundary, which affects how much Next.js can treat as straightforwardly optimizable static structure. Scoping the provider to just the subtree that actually needs the context value keeps the rest of the app's structure (`<html>`, `<head>`, unrelated siblings) outside that boundary.

The trap: treating provider placement as purely stylistic ("wrap everything at the root to be safe") without connecting it to the actual mechanical cost of a wider client boundary.

**Q (Medium): You start a data fetch in a Server Component without awaiting it, and pass the resulting promise to a Client Component via context, which reads it with `use()`. Why start the fetch without awaiting, instead of just awaiting it and passing the resolved value?**

Answer: Awaiting the fetch in the Server Component blocks that component's own render until the data arrives, which then blocks everything depending on that Server Component finishing. Passing the *unresolved* promise lets rendering continue immediately — the response can begin streaming — while the Client Component suspends on `use()` only for the specific piece that actually needs the data, once it's ready. This starts the request as early as possible (before the client even runs) while not gating unrelated content behind it.

The trap: not recognizing this as the same streaming principle from Phase 3 (push the blocking work behind its own boundary, don't let it gate everything above it) applied specifically to the server-to-client promise-passing mechanism rather than `<Suspense>` directly.

**Q (Low): Can a Client Component accept more than one Server-Component-rendered "slot," or is `children` the only option?**

Answer: Any prop can serve as a slot, not just `children` — a Client Component can accept several named props (like `title` and `children` simultaneously), each holding rendered React elements owned by a Server Component ancestor. The mechanism is identical regardless of the prop's name: rendered output is serializable data crossing via props, same as any other prop.

The trap: assuming `children` is a special-cased mechanism distinct from ordinary props — it isn't; it's just the conventional name for "the" slot when there's only one.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the owner/parent distinction and why it determines where a component renders
- [ ] Can write the `children`-as-slot pattern for nesting a Server Component inside a Client Component
- [ ] Can explain why React Context needs a Client Component wrapper in an RSC tree
- [ ] Can explain why provider placement depth matters for static optimization
- [ ] Can explain why a fetch passed through context to `use()` should be started, not awaited, in the Server Component

---
*Next: Fetching data directly in Server Components — now that you know how server- and client-rendered content compose, the next question is the actual mechanics of writing an async Server Component that fetches its own data.*
