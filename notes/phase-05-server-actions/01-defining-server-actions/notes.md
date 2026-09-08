# Defining Server Actions (`'use server'`)

**Demo:** `app/playground/phase-05-server-actions/01-defining-server-actions` — run `npm run dev`, visit
`/playground/phase-05-server-actions/01-defining-server-actions`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `'use server'` at the top of a function body | Marks that one function as a Server Function (inline form) | Only legal inside a Server Component file — a Client Component file can't define one this way |
| `'use server'` at the top of a whole file | Marks **every export** in that file as a Server Function | The only way to define a Server Function a Client Component can *import* |
| "Server Action" | A Server Function used in an action context — passed to `<form action>`/`<button formAction>`, or wrapped in `startTransition` | Not a separate API — a naming convention for a particular usage of Server Functions |
| The compiled reference in a client bundle | An encrypted action ID + POST dispatcher, not the function body | The real implementation never ships to the browser, but the endpoint it calls is directly reachable |

## Where Does This Run?

Two different moments, easy to conflate. **Defining** one is a compile-time transform: Next.js's compiler sees `'use server'`, and for any client bundle that would otherwise include the function, swaps its body for a small reference object instead. **Invoking** one is a runtime event: every call — from a form submit, a click handler, wherever — becomes its own POST request that runs the real function body on the server, independent of whatever render produced the reference in the first place.

## What Is This?

React (not Next.js) defines the underlying primitive: a **Server Function** is an async function marked with the `'use server'` directive, guaranteed to execute only on the server no matter where it's called from. Next.js is the framework that gives Server Functions somewhere to run and a network-level protocol for reaching them.

"Server Action" is not a different mechanism — it's what you call a Server Function when it's used for a mutation, specifically passed to `<form action>`, `<button formAction>`, or invoked from a client interaction wrapped in `startTransition` (which forms and buttons do automatically). Every Server Action is a Server Function; not every Server Function is used as an action (you can also just call one from an event handler to fetch something, as [`FileLevelButton.tsx`](../../../app/playground/phase-05-server-actions/01-defining-server-actions/FileLevelButton.tsx) does in this topic's demo).

```ts
// Inline — only legal in a Server Component
async function increment(formData: FormData) {
  'use server'
  // ...
}
```

```ts
// File-level — the only form a Client Component can import
'use server'

export async function increment(formData: FormData) {
  // ...
}
```

> **Check yourself:** Is "Server Action" a distinct API from "Server Function," or a name for a particular usage pattern?

## Why Does It Exist?

Before Server Actions, mutating server-side data from a client interaction meant hand-building the whole pipeline yourself: write an API route (`pages/api/posts.ts`), write a `fetch` call to hit it from the client, serialize the payload yourself, handle the response, and manually trigger a refetch or `router.refresh()` to see the result. Three separate pieces of code — the endpoint, the client call, the re-sync — that had to be kept in sync by hand and only loosely related by a URL string.

`'use server'` collapses the first two of those into one function definition. You write the mutation once, in one place, and the framework generates the client-callable RPC wiring — the endpoint, the request, the serialization — from that single definition. Because Next.js also controls the response format, it goes a step further than a typical RPC call: when an action triggers revalidation, the same HTTP response can carry back both the action's return value *and* a freshly rendered version of the current route, in one roundtrip (Topic 6 covers exactly which calls trigger this).

## How It Works

### Two ways to mark a function, one restriction

- **File-level**, `'use server'` as the very first line of a file, before any imports: every function the file exports becomes a Server Function. This is the *only* way to get a Server Function that a Client Component can import — a Client Component's own file can never itself contain the directive.
- **Inline**, `'use server'` as the first line inside an async function's body: marks just that one function. This form is only legal inside a Server Component (or another server-only file) — you cannot write it inside a Client Component's function body, and the compiler rejects it at build time if you try. Inline Server Functions defined in a Server Component are typically wired straight into that component's own markup, most often a `<form action={...}>` (as `incrementInlineAction` does in this topic's demo page).

### Client Components: import, never define

A Client Component file cannot contain `'use server'` at all, inline or file-level. To use a Server Function from client code, you import it from a dedicated `'use server'` file — exactly what [`FileLevelButton.tsx`](../../../app/playground/phase-05-server-actions/01-defining-server-actions/FileLevelButton.tsx) does with `incrementFileLevelCounter` from `actions.ts`. You can also receive one as a prop from a Server Component, since a Server Function crosses the server/client boundary as a special serializable reference — the one exception to "you can't pass a plain function as a prop across the boundary" (`React-prep`'s Phase 4 Topic 2 covers why ordinary functions can't cross this way).

### The compile step: what actually ships

For any client bundle that would otherwise include a `'use server'`-marked function, the compiler replaces its body with a reference object — an encrypted action ID plus a small dispatcher that POSTs back to the server when called. The real implementation stays server-side entirely; nothing about *how* the function works is present in the browser. This is exactly why a Server Function behaves like an ordinary value you can import, pass as a prop, or store in an object, even though "a function whose code lives somewhere else" sounds unusual — from the client's perspective it's just a callable reference.

An inline Server Function can also close over local variables from its enclosing Server Component's scope (a `params.id`, for instance). Those captured values get encrypted along with the action reference before anything ships to the client — Topic 7 (Server Action security) covers this closure-encryption mechanism and its `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` deployment implications in full; this topic only needs you to know the capture happens.

Because the compiled reference is a real POST endpoint with a real URL, it's reachable by anyone who can send that request — not only through your UI. Defining a Server Function is what creates this exposure, even before you've written any client code that calls it; Topic 7 is where the authentication/authorization response to that fact gets its own full treatment.

> **Check yourself:** A `'use server'` file exports two functions. A Client Component only ever imports one of them. Is the other one still reachable from outside your application?

## The Pages Router Equivalent

Pages Router had no built-in RPC mechanism at all — the closest equivalent was always a hand-built API route under `pages/api/`, called from the client with a manual `fetch`. Next.js still supports that same idea in the App Router as **Route Handlers** (`route.ts`, Phase 6), and they remain the right tool for non-mutation, non-form use cases like webhooks or a public REST-style API. Server Actions didn't replace Route Handlers; they added a purpose-built path specifically for the "client triggers a server mutation" case, with the RPC wiring generated instead of hand-written. Phase 6 Topic 7 compares the two directly once Route Handlers have their own full treatment.

## Gotchas

- **File-level `'use server'` exposes every export, including ones you didn't mean to.** A helper function you export from the same file purely for internal reuse becomes just as reachable as your intended action. Keep `'use server'` files scoped to functions genuinely meant to be called this way; give non-action helpers their own module, or keep them unexported.
- **Inline `'use server'` only compiles inside an async function in a Server Component file.** Writing it inside a Client Component's function is a build-time error, not a runtime one — you find out immediately, not after shipping.
- **Every `'use server'`-marked function must be `async`.** It's invoked over the network and has to return a promise; a synchronous function with the directive fails to compile.
- **Defining a Server Function creates a public endpoint by itself — no UI gating required.** It's easy to assume "only my form calls this" because that's the only place you wrote a call to it, but the compiled action ID is POST-reachable directly. Auth/authorization has to live *inside* the function, not in whatever UI happens to render a button for it (Topic 7 in full).

## Interview Questions

**Q (High): What's the difference between a "Server Function" and a "Server Action" — is one a subset of the other, or are they unrelated APIs?**

Answer: A Server Function is any async function marked `'use server'`, guaranteed to run only on the server. "Server Action" isn't a separate API — it's the name for a Server Function used specifically as a mutation, passed to `<form action>`, `<button formAction>`, or invoked in a client interaction wrapped in `startTransition`. Every Server Action is a Server Function; a Server Function used purely to fetch data from an event handler, with no form or transition involved, wouldn't typically be called an action.

The trap: treating them as two different mechanisms, or being unable to say which term is the broader one.

**Q (High): Why can't a Client Component define a Server Function inline, and how does it use one anyway?**

Answer: `'use server'` inline is only legal inside an async function in a Server Component (or other server file) — the compiler rejects it at build time inside a Client Component. To use a Server Function from client code, you import it from a separate file that has `'use server'` at the top of the *file* (marking every export as a Server Function), or receive it as a prop passed down from a Server Component.

The trap: not knowing this is a hard compile-time restriction, or assuming a Client Component just needs `'use server'` somewhere in its own file to work.

**Q (High): What does the compiler actually do with a `'use server'`-marked function when it ends up in a client bundle?**

Answer: It strips the real implementation out of the client bundle entirely and replaces it with a reference — an encrypted action ID plus a dispatcher that sends a POST request to the server when the reference is called. The function's actual logic never ships to the browser; only enough information to identify and invoke it remotely does.

The trap: assuming the function's source code is merely hidden or minified in the client bundle rather than genuinely absent, replaced by a reference object.

**Q (Medium): What's the risk of putting `'use server'` at the top of a file that also exports a helper function you never intended to expose as an action?**

Answer: The file-level directive marks *every* export as a Server Function, with no way to opt individual exports out. The unintended helper becomes just as POST-reachable as the real action, whether or not any client code imports it — reachability comes from compilation, not from usage. The fix is keeping `'use server'` files scoped to functions genuinely meant to be invoked this way.

The trap: assuming only the exports actually imported somewhere become reachable — the directive applies file-wide regardless of what's imported.

**Q (Medium): How would you have implemented a client-triggered server mutation before Server Actions existed, in the Pages Router?**

Answer: By hand-building an API route under `pages/api/`, then writing a client-side `fetch` call to hit it, serializing the request body yourself, and manually triggering a refetch or page refresh to reflect the result — three separate, loosely-coupled pieces of code kept in sync by convention rather than by the framework.

The trap: describing only "an API route" without naming that the client-side wiring and the re-sync step were also entirely manual — that manual RPC wiring is precisely what Server Actions generate for you.

**Q (Low): Can an inline Server Action close over local variables from its enclosing Server Component, and what happens to them?**

Answer: Yes — an inline `'use server'` function is a genuine closure over its surrounding scope, so it can reference local variables like a `params.id` from the enclosing Server Component. Next.js encrypts those captured values before the action reference ships to the client, so they aren't exposed as plain data in the client bundle.

The trap: assuming inline actions are somehow "flattened" or can't capture outer scope the way an ordinary closure would — they behave like normal JavaScript closures, with the addition of encryption on the captured values.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state the Server Function / Server Action relationship in one sentence without conflating them
- [ ] Can name both ways to mark a function `'use server'` and which one a Client Component is restricted to
- [ ] Can explain what the compiler actually replaces the function body with in a client bundle
- [ ] Can explain why an unexported-but-intended-internal helper in a `'use server'` file is still a real exposure risk
- [ ] Can name the Pages Router equivalent and what part of it Server Actions automate away
- [ ] Knows inline actions can close over local Server Component variables, and that those get encrypted

---
*Next: Calling Server Actions from forms — this topic defined the two shapes a Server Function can take; the next one goes deep on the primary way they get invoked, React's `<form>` extensions, `FormData` extraction, and what "progressive enhancement by default" actually buys you.*
