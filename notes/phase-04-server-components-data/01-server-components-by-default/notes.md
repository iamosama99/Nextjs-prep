# Server Components by Default

**Demo:** `app/playground/phase-04-server-components-data/01-server-components-by-default` — run `npm run dev`, visit `/playground/phase-04-server-components-data/01-server-components-by-default`, and check both your terminal and the browser console.

> **Assumes `React-prep`:** the *what* and *why* of React Server Components — the fiber-level mechanics, the RSC protocol, why they were invented — is `React-prep`'s territory (`phase-11-modern-react`). This topic is scoped to what's actually Next.js-specific: how the App Router wires RSC into routing, prerendering, and the client bundle.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A `page.tsx`/`layout.tsx` with no directive | A Server Component — the App Router default | No JS bundle cost, direct database/secret access, by default |
| `'use client'` at the top of a file | An **entry point** into the client module graph | Not "this component runs on the client instead of the server" — see How It Works |
| "Server-rendered" | Describes *how HTML was produced* (SSG/ISR/SSR) | Orthogonal to "Server Component," which describes *where code runs* |
| RSC Payload | A serialized description of the rendered tree + Client Component references | What the server actually sends; HTML is derived from it, not the other way around |

## Where Does This Run?

Server Components run **only** on the server — their code is never sent to the browser, full stop. Client Components run on the server too (to produce the initial HTML) **and** in the browser (to hydrate and handle subsequent updates). This asymmetry — "Client" doesn't mean "browser-only," it means "also runs in the browser" — is the single most load-bearing fact in this topic.

## What Is This?

By default, every component you write in the App Router — `page.tsx`, `layout.tsx`, any component you import into one without a `'use client'` directive — is a Server Component. This isn't a Next.js-specific invention; it's React's own architecture (RSC). What Next.js adds is the routing and rendering machinery that makes RSC practical: file-based routing that's Server-Component-shaped by default, integration with prerendering (Phase 3), and the build tooling that splits your code into server and client module graphs automatically.

> **Check yourself:** Without looking, explain in one sentence why a Client Component still needs to run on the server at all, given that its whole point is being interactive in the browser.

## Why Does It Exist?

`React-prep` covers RSC's motivation in depth — this is deliberately brief. The short version, Next.js-flavored: Server Components let a component fetch data, read secrets, and query a database *during its own render*, with zero client-side JavaScript cost, because the component's code simply never ships to the browser. Client Components exist for the remainder — anything requiring state, effects, event handlers, or browser APIs. The App Router defaults to Server Components specifically because most of a typical page (layout chrome, data display, static content) doesn't need any of that, and previously *all* of it would have shipped to the browser regardless.

## How It Works

### Two module graphs, one tree

Every component's module belongs to the server module graph, the client module graph, or both. A `'use client'` directive at the top of a file doesn't move that component "to the client" — it draws a **boundary** in the module graph. Everything that file imports, and every component it directly renders, gets pulled into the client bundle. The server graph never imports the client graph; instead, during rendering, the server produces *references* to Client Components (not their code) and serializes the props being passed to them. That reference-plus-serialized-props package is the **RSC Payload**.

```txt
Server Component
├─ Server Component
└─ Client Component
   └─ Client Component
```

### "Server-rendered" and "Server Component" are answering different questions

This is the single sharpest interview trap in this topic. **"Server-rendered"** describes *how the HTML was produced* — at build time (SSG), incrementally after the build (ISR), or per-request (SSR). This concept predates RSC entirely and applies to Client Components too: a Client Component renders once on the server (to produce real HTML for the initial response) and again in the browser during hydration.

**"Server Component"** describes something different: *where the component's code lives and executes, ever* — exclusively on the server, never shipped to the browser as JavaScript. A component can be server-rendered without being a Server Component (any Client Component, on its first render). The reverse is also true in a sense: a Server Component contributes to server-rendered HTML, but there's no "client-rendering" for it to also do — its code simply isn't there to run again.

```tsx
'use client'

export default function Hello() {
  console.log('Hello rendered') // On a direct visit: logs on the server AND in the browser
  return <p>Hello</p>
}
```

On a direct page visit, this log appears in your terminal (the server render) *and* your browser console (hydration). On a client-side navigation to this route, only the browser log appears — the server sends the RSC Payload, and the component renders straight from that in the browser, no fresh server-side render of this specific component involved.

### How data enters the tree — before and after RSC

Pre-RSC (and still how the Pages Router works): data is fetched in a loader (`getServerSideProps`, `getStaticProps`) *before* the component tree renders, then handed down as props. The tree receives data; it doesn't fetch it.

```txt
Data → Loader/API → Props → Component tree
```

With RSC, any Server Component in the tree can fetch data **during its own render** — no separate loader step required, no prop-drilling from a single top-level fetch:

```tsx
export default async function Page() {
  const posts = await getPosts() // runs on the server, during this component's render
  return <PostList posts={posts} />
}
```

Because a Server Component runs exclusively on the server, it can read a database, the filesystem, an internal service, or a secret directly, without standing up an API route to broker that access — the "no API layer between your component and your data" pattern that's genuinely new relative to the Pages Router. Topic 4 covers the mechanics of writing these async components; this topic is about *why* that's a safe and sensible default.

## Gotchas

- **"Client" doesn't mean "doesn't run on the server."** A Client Component executing during the initial server render is completely normal — it's producing the HTML for the non-interactive preview the browser shows immediately, before hydration attaches event handlers. Assuming Client Component code *never* touches the server is a common and consequential misunderstanding (it affects what you can safely assume about secrets — see Topic 7).
- **Mutating a Server Component's rendered DOM nodes directly is unsafe.** Since Server Component code never reaches the browser, there's no live instance there to reconcile a direct DOM mutation against — the only way to update its output is re-rendering it on the server and letting React reconcile the new RSC Payload.
- **A crawler that doesn't run JavaScript only sees the initial HTML response.** Both Server and Client Components contribute to that HTML, so this isn't a "Server Components are good for SEO, Client Components are bad" distinction — it's about whether content is gated behind an interaction/event, which never appears in that first response regardless of which component type produced it.

## Interview Questions

**Q (High): What's the difference between "this page uses Server-Side Rendering" and "this component is a Server Component"? Why does conflating them cause confusion?**

Answer: "Server-rendered" (SSG/ISR/SSR) describes *how HTML was produced* for a request — a concept that predates RSC and applies equally to Client Components, which also render once on the server to produce real initial HTML. "Server Component" describes *where a component's code lives* — exclusively on the server, never shipped to the browser at all. A Client Component is server-rendered on its first paint and then hydrates; a Server Component is server-rendered and has no further client-side existence, because its code was never sent. Conflating them leads to statements like "Server Components are just SSR" that miss the actual distinction: bundle size and code location, not just where HTML comes from.

The trap: candidates who learned Next.js primarily through the Pages Router often use "server-rendered" and "Server Component" interchangeably, because in that model there was no third option — this is exactly the distinction a senior interview is checking for.

**Q (High): A `'use client'` component logs to the console. On a direct page visit, where does that log appear? On a client-side navigation to the same route?**

Answer: On a direct visit, it appears in both the terminal (the server render that produces initial HTML) and the browser console (hydration re-running the component client-side). On a client-side navigation, only the browser console shows the log — the server sends the RSC Payload for the destination route, and the Client Component renders directly from that in the browser without a fresh server-side render specifically for this navigation.

The trap: assuming a Client Component "only runs in the browser" and expecting the terminal log to never appear — it's the direct-visit case that catches this assumption.

**Q (Medium): How does data fetching in RSC differ from `getServerSideProps` in terms of where fetching logic lives relative to the component tree?**

Answer: `getServerSideProps` (and `getStaticProps`) run entirely before the component tree renders, producing props that are then handed down — data flows in from outside the tree. With RSC, any Server Component can fetch its own data during its own render, so fetching logic lives *inside* the tree, colocated with the component that needs it, rather than centralized in one loader function that has to know about every descendant's data requirements.

The trap: describing this purely as "less boilerplate" without identifying the structural difference — data flowing in from a single external step versus being requested by individual components as they render, which is also what enables Topic 5's parallel-fetching patterns.

**Q (Medium): Why can't you safely assume a Client Component never has access to server-only secrets, given that it "runs in the browser"?**

Answer: A Client Component's code also executes on the server during the initial render (to produce HTML), and any module it imports is part of that execution — if a Client Component (or something it imports) references `process.env.SOME_SECRET` without the `NEXT_PUBLIC_` prefix, Next.js replaces it with an empty string in the browser bundle, but the *code path* attempting to read it still exists and could behave unexpectedly, and more importantly, any server-only module accidentally imported into a Client Component's module graph gets pulled into the client bundle wholesale unless something (like the `server-only` package, Topic 7) prevents it.

The trap: treating "Client Component" as a hard security boundary by itself — it's a *bundling* boundary; the actual security guarantee comes from disciplined data-passing practices (Topic 8) and tools like `server-only`, not from the directive alone.

**Q (Low): Can a Server Component's rendered output be updated by directly manipulating the DOM nodes it produced?**

Answer: Not safely — since the Server Component's code never reaches the browser, there's no client-side instance of it for React to reconcile a manual DOM mutation against. The only correct way to update its output is to re-render it on the server (triggered by navigation, a mutation's revalidation, or a refresh) and let React reconcile the new RSC Payload against the existing DOM.

The trap: reaching for a `ref` and imperative DOM manipulation on what looks like "just another rendered element," not realizing there's no live component instance backing it client-side to keep that mutation in sync.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the difference between "server-rendered" and "Server Component" in one sentence each
- [ ] Can explain why a `'use client'` component's console.log appears in both the terminal and browser console on a direct visit, but only the browser on a client navigation
- [ ] Can describe what the RSC Payload actually contains
- [ ] Can explain how RSC changes where data-fetching logic lives compared to `getServerSideProps`
- [ ] Can explain why "Client Component" isn't by itself a security boundary

---
*Next: The Client Component boundary in practice — the mechanics of `'use client'` itself: what actually crosses the boundary, what doesn't, and the compound-component gotcha that trips up even experienced React developers.*
