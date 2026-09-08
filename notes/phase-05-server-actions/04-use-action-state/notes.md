# `useActionState` (Form State + Validation Errors)

**Demo:** `app/playground/phase-05-server-actions/04-use-action-state` — run `npm run dev`, visit
`/playground/phase-05-server-actions/04-use-action-state`. The fields start pre-filled with invalid
values; submitting as-is round-trips real server-side validation. Verified end-to-end via raw POSTs: an
invalid submission returns both field errors, a valid one creates the account and updates the list.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `const [state, formAction, pending] = useActionState(action, initialState)` | Wraps a Server Action so its **return value** becomes reactive UI state | No manual `useState` + refetch dance to surface a validation error |
| The action's signature becomes `(prevState, formData) =>` | `useActionState` inserts the previous state as the **first** argument | The same function can no longer be called with just `FormData` elsewhere without adjusting the call site |
| `state` after a submission | Whatever the action most recently **returned** | The action controls exactly what the UI can react to — return only what the form needs |
| `pending` from `useActionState` | A second, independent source of the same kind of boolean `useFormStatus` (Topic 3) provides | Convenient right where you already have `state`; doesn't replace `useFormStatus`'s reusable-child-component use case |

## Where Does This Run?

`useActionState` is a React hook — it only runs client-side, so the component calling it must be a Client Component. The Server Action it wraps still only ever executes on the server, exactly as in Topics 1–3; the hook changes how the action's *return value* reaches the client, not where the function's body runs.

## What Is This?

Topic 3's `useFormStatus` answers "is this form busy?" — a boolean, nothing more. It has no opinion on what the action actually *returned*. Server Action returns aren't automatically displayed anywhere; without more, `signup`'s field-level validation errors would run, return an object, and that object would simply vanish. `useActionState` (from `react`, not `react-dom`) closes that gap: it wraps an action so that whatever the action returns becomes a piece of React state, re-rendered into the component automatically after each submission.

```tsx
'use client'
import { useActionState } from 'react'
import { signup } from './actions'

const initialState = { errors: {}, message: '' }

function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState)
  return (
    <form action={formAction}>
      <input name="email" />
      {state.errors.email && <p>{state.errors.email}</p>}
      <button disabled={pending}>Sign up</button>
    </form>
  )
}
```

> **Check yourself:** Before a form has ever been submitted, what does `state` hold — the action's return value, or something else?

## Why Does It Exist?

A Server Action that validates input and returns `{ errors: {...} }` is straightforward to write. The hard part historically was the client side: without `useActionState`, showing that error message means a Client Component wrapping the whole thing in its own `useState`, manually calling the action, awaiting the result, and setting state itself — reintroducing exactly the manual async-handler boilerplate that `<form action={fn}>` (Topic 2) was designed to remove. `useActionState` keeps the direct `<form action={formAction}>` wiring (still progressive-enhancement-friendly, still no `onSubmit` needed) while adding the one thing plain form actions can't do on their own: making the return value visible as state.

## How It Works

### The action's signature changes — `prevState` arrives first

Once an action is passed through `useActionState`, React calls it with the *previous* state as the first argument and `FormData` as the second: `(prevState, formData) => nextState`. [`actions.ts`](../../../app/playground/phase-05-server-actions/04-use-action-state/actions.ts)'s `signup` reflects this — `prevState` isn't used in this demo's validation logic, but the parameter has to be there for the signature to match what the hook calls it with. This is a real, sometimes surprising consequence: a function written to be used with `useActionState` can no longer be handed directly to a plain `<form action={fn}>` (Topic 2's pattern) without the extra argument getting in the way — the two invocation styles expect different signatures.

### `initialState` only applies before the first real call

The second argument to `useActionState`, `initialState`, is what `state` holds on first render, before any submission has happened. After that, `state` is always whatever the action itself most recently returned — not a merge, not an update, a full replacement of the previous value with the new return.

### Under the hood: still `bind`, still a real form submission

Inspecting this topic's demo confirms what `useActionState` compiles down to: the `formAction` handed back is a Server Action reference with the *current* state bound as its first argument — structurally identical to the `.bind()` pattern from Topic 2, just generated for you instead of written by hand. Because it's still a genuine action reference wired to a real `<form action={...}>`, this form submits and revalidates correctly even without JavaScript loaded (verified via a raw POST matching exactly what a no-JS browser submission would send) — `useActionState` doesn't cost you progressive enhancement.

### `pending` here vs. `useFormStatus`'s `pending`

`useActionState` returns its own `pending` boolean as its third element, tracking the same in-flight submission `useFormStatus` (Topic 3) tracks. They're not in conflict — they're two ways to reach the same underlying tracking, useful in different places: `useActionState`'s `pending` is convenient in the component that already holds `state` (no extra hook, no extra nesting required); `useFormStatus`'s value is that it works from a genuinely separate, reusable child component with no props, useful when a submit button needs to be shared across many unrelated forms. Using both in the same form is redundant, not wrong — pick whichever is already in scope where you need it.

## Gotchas

- **A `useActionState`-wrapped action's signature is incompatible with a plain, un-wrapped `<form action={fn}>` call.** The inserted `prevState` first argument means the same function generally needs a thin variant (or to always be used through `useActionState`) rather than being freely interchangeable between the two invocation styles from Topic 2.
- **`state` doesn't merge with the previous value — it's replaced entirely** by whatever the action returns. An action that only returns `{ errors }` on failure and forgets to also return the unchanged rest of the shape on success can silently wipe fields the UI depended on.
- **The action still has to be a genuine Server Function** (`'use server'`, from a Server Component or an imported file, per Topic 1) — `useActionState` changes how its result surfaces on the client, not the rules for where or how it's defined.

## Interview Questions

**Q (High): How does `useActionState` change a Server Action's function signature, and what breaks if you forget this?**

Answer: The wrapped action is called as `(prevState, formData) => nextState` — the previous state becomes the first argument, shifting `FormData` to second. If the same function is also used elsewhere as a plain `<form action={fn}>` handler (Topic 2's direct pattern, expecting only `FormData`), that call site now receives `FormData` as if it were `prevState`, breaking the function's logic in a way that often isn't an obvious type error until runtime.

The trap: assuming a Server Action is freely interchangeable between direct form usage and `useActionState` usage without adjusting for the inserted argument.

**Q (High): What does `state` hold on the very first render of a component using `useActionState`, before any form submission has occurred?**

Answer: Exactly the `initialState` value passed as `useActionState`'s second argument — not the result of calling the action, since the action hasn't run yet. `state` only reflects an actual action return value after the first real submission.

The trap: assuming the action runs once automatically on mount to "seed" the state — it doesn't; the initial value is whatever you explicitly provide.

**Q (Medium): `useActionState` and `useFormStatus` both expose a `pending` boolean. Are they redundant, and if not, when would you reach for one over the other?**

Answer: They track the same underlying in-flight submission, so functionally they're not contradictory, but they suit different structural needs. `useActionState`'s `pending` is convenient exactly where `state` already lives — no extra component required. `useFormStatus`'s value is that it works from a separate, reusable child component with zero props, which matters when a submit button (or other status-aware UI) needs to be shared across many forms that don't all use `useActionState` the same way. Using both in one form is redundant but not incorrect.

The trap: claiming one hook is strictly "better," instead of naming the structural difference — component reusability vs. co-location with state — that actually decides which fits a given case.

**Q (Medium): Does `state` returned by `useActionState` merge with the previous state, or replace it?**

Answer: It replaces it entirely. Whatever the action returns becomes the new `state` in full — there's no automatic shallow-merge behavior. An action that returns a partial shape on one branch (e.g., only `{ errors }` on failure, forgetting the rest of the fields the success branch returns) will have those other fields disappear from `state` after that branch runs, not silently retain their previous values.

The trap: assuming React "smartly" merges the returned object with the prior state the way `setState` with a partial object sometimes appears to for class components — `useActionState` does no such merging.

**Q (Low): Is `useActionState` a Next.js API or a React API?**

Answer: React — it's imported from `react`, not `react-dom` or any Next.js package, and works with any framework implementing React Server Functions, not exclusively Next.js. Next.js is where the demonstrated Server Action it wraps happens to be defined and where the single-roundtrip response behavior (Topic 1) comes from, but the hook itself is framework-agnostic React.

The trap: conflating "used heavily in Next.js docs and demos" with "a Next.js-specific API" — the same confusion the `'use server'` directive itself (Topic 1) is subject to.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state the exact call signature `useActionState` gives the wrapped action, including argument order
- [ ] Can explain why a `useActionState`-wrapped action can't generally also be used as a plain `<form action={fn}>` handler unmodified
- [ ] Can explain what `state` holds before the first submission vs. after
- [ ] Can explain why `state` replaces rather than merges on each return
- [ ] Can articulate the structural difference between `useActionState`'s `pending` and `useFormStatus`'s `pending`
- [ ] Knows this is a React hook, not a Next.js-specific API

---
*Next: `useOptimistic` for optimistic UI — this topic surfaced the action's *server-confirmed* result after a round trip; the next one covers showing a change to the user *before* that round trip finishes, and reconciling if the server disagrees.*
