# `useFormStatus` & Pending States

**Demo:** `app/playground/phase-05-server-actions/03-use-form-status` — run `npm run dev`, visit
`/playground/phase-05-server-actions/03-use-form-status`. Both forms submit to a Server Action with a
deliberate 1.5s delay (verified for real: a raw POST measured ~1.57s round-trip) — click each submit
button and watch which one actually shows a pending state.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `useFormStatus()` from `react-dom` | Reads the submission status of the **nearest ancestor `<form>`**, via context | It's a read, not a subscription you wire up yourself — no prop, no state lifted anywhere |
| Called in a component that is a **child** of the `<form>` | The only placement where it resolves to that form's real status | The component that renders the `<form>` element itself is not a "child" of it |
| `{ pending, data, method, action }` | The full return shape as of React 19 | Only `pending` existed pre-19; the extra keys describe the in-flight submission itself |
| A `<SubmitButton>` used across many different forms | The same status-aware component, reusable everywhere | No form-specific state or props required — it just reads whichever form it happens to be inside |

## Where Does This Run?

Entirely client-side, after hydration. `useFormStatus` is a React hook — it only exists to read reactive UI state, which has no meaning during server rendering or before the page has hydrated. The component that calls it must be a Client Component (`'use client'`); the `<form>` itself, and the Server Action it submits to, are unaffected by any of this.

## What Is This?

Once a form is wired to a Server Action (Topic 2), submitting it does real work over the network — however briefly. Without some indicator, the UI just... sits there until the response comes back, indistinguishable from a form that silently did nothing. `useFormStatus`, from `react-dom`, answers exactly one question — "is the nearest form currently submitting?" — by reading it off React's own tracking of that submission, with no state you declare or wire up yourself.

```tsx
'use client'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>
}
```

> **Check yourself:** Is `useFormStatus` reading global application state, or something scoped to one specific form?

## Why Does It Exist?

A Server Action's pending window is real network latency the UI has to account for somehow — disable the button so a slow connection doesn't produce three submissions, show a spinner so the click visibly registered. The naive fix is local `useState` plus a manually-wrapped submit handler (`setPending(true)`, call the action, `setPending(false)`), but that reintroduces exactly the boilerplate Server Actions were meant to remove, and it has to be rebuilt per form. `useFormStatus` exists because React already knows a form is mid-submission internally (it's the thing dispatching the action) — the hook exposes that existing knowledge instead of asking you to duplicate the bookkeeping.

## How It Works

### It's a context read, scoped by DOM position

`useFormStatus` doesn't take a form reference, an id, or any argument at all — it looks up the nearest enclosing `<form>` automatically, the same way `useContext` resolves to the nearest matching `Provider` above it in the tree. This is precisely why *where* the hook is called matters as much as whether it's called: it needs to be in a component that renders as a **descendant** of the `<form>` element, not the component that renders the `<form>` element itself.

### The gotcha this topic exists to name: same-component placement doesn't work

[`WrongForm.tsx`](../../../app/playground/phase-05-server-actions/03-use-form-status/WrongForm.tsx) calls `useFormStatus()` in the exact same component function that returns the `<form>` JSX. This compiles fine, runs fine, and silently does the wrong thing: that component isn't a *child* of the form it renders — it's the form's owner — so the hook never observes that form's submission, and `pending` stays `false` for the button's entire disabled/enabled lifecycle, submission or not.

[`CorrectForm.tsx`](../../../app/playground/phase-05-server-actions/03-use-form-status/CorrectForm.tsx) fixes this by splitting the button into its own component, [`SubmitButton.tsx`](../../../app/playground/phase-05-server-actions/03-use-form-status/SubmitButton.tsx), rendered *inside* the `<form>` as a child. From `SubmitButton`'s position in the tree, the enclosing `<form>` genuinely is an ancestor, and `useFormStatus` resolves correctly.

```tsx
// CorrectForm.tsx — a Server Component; it needs no hook itself
<form action={slowSave}>
  <input name="text" />
  <SubmitButton /> {/* Client Component, genuinely nested inside <form> */}
</form>
```

### The full return shape (React 19)

Beyond `pending`, `useFormStatus` also returns `data` (the `FormData` being submitted), `method` (the HTTP method, normally `"post"`), and `action` (a reference to the action itself) — useful for a status component that wants to say something more specific than a generic spinner, like echoing back which field is being saved. Pre-19, only `pending` was available.

### Why a dedicated `<SubmitButton>` component, not inline state

Because `useFormStatus` needs no props and no knowledge of which form it's inside, the same `SubmitButton` component works unmodified across every form in an application — drop it in as a child, and it reads whichever form happens to be its ancestor. This is the practical payoff of the context-based design: one reusable status-aware component instead of re-deriving pending state per form.

> **Check yourself:** Why does moving `useFormStatus`'s call site from the form's owner into a child component fix the "always false" bug, when both components render literally the same `<form>` element?

## Gotchas

- **Calling `useFormStatus` in the component that renders the `<form>` compiles and runs without any error** — it just always returns the initial (`pending: false`) status, because that component is the form's owner, not a descendant of it. This is the single most common mistake with the hook, and it fails silently rather than loudly.
- **The hook has no return value outside of a form's submission lifecycle** — calling it in a component with no enclosing `<form>` at all returns the same inert default state, not an error, which can mask the "wrong placement" mistake even further during casual testing.
- **This is entirely a post-hydration concept.** Before JavaScript loads, a Server-Action-backed form still works via a real browser submission (Topic 8) — there's no `pending` state to show during that fallback path, because there's no React tree running yet to track it.

## Interview Questions

**Q (High): Why does `useFormStatus`, called in the same component that renders a `<form>`, always report `pending: false` even while that form is actively submitting?**

Answer: `useFormStatus` resolves to the nearest *ancestor* `<form>` in the component tree, the same way a context read resolves to the nearest enclosing provider. A component that renders a `<form>` element is that form's owner, not one of its descendants, so calling the hook there never observes that form's own submission. The fix is moving the hook into a separate component nested as a child inside the `<form>`.

The trap: assuming any call to the hook "somewhere near" the form works, rather than recognizing this is a strict descendant relationship in the render tree.

**Q (High): What problem does `useFormStatus` solve that a plain `useState` "isSubmitting" flag would also solve, and why prefer the hook?**

Answer: Both can show a pending indicator, but a manual `useState` flag requires wrapping the submit in your own async handler (`setPending(true)` / call the action / `setPending(false)`), rebuilt for every form. `useFormStatus` reads status React is already tracking internally for a Server-Action-backed form submission, with no wiring, and — because it's a context-style read scoped to the nearest form — the same component reading it is reusable unmodified across every form in the app, unlike a `useState` flag that's local to one component's own logic.

The trap: treating this as purely a stylistic preference rather than naming the concrete reuse and boilerplate-elimination benefit.

**Q (Medium): What information does `useFormStatus` return in React 19 beyond the `pending` boolean, and what's each one for?**

Answer: `data` (the `FormData` object being submitted, useful for echoing submitted values back in a status message), `method` (the HTTP method used, typically `"post"`), and `action` (a reference to the action function itself). Pre-React-19, only `pending` was available.

The trap: only knowing `pending` and being unable to name what else changed in React 19 — a common gap when the codebase or training material predates the hook's expanded return shape.

**Q (Medium): Does `useFormStatus` require a Server Action specifically, or does it work with any `<form>`?**

Answer: It works with any `<form>` whose `action` is a function (a Server Action, or a client-side action function passed to `action`) — the pending state it reads comes from React's own action-dispatch tracking, not something Next.js-specific to Server Actions. A plain `<form>` with a URL string `action` (a traditional browser navigation) has no such tracked status for the hook to read.

The trap: assuming this is a Next.js API tied specifically to Server Actions, when it's a `react-dom` hook tied to React's function-based form actions in general.

**Q (Low): Why does the demo's `slowSave` action have an artificial `setTimeout` delay?**

Answer: Purely to make the pending window long enough (1.5s here) to actually observe in a browser — a fast local mutation might resolve in milliseconds, too quick to visually register a pending state during manual testing. Any real mutation with genuine network or database latency produces the same window without needing an artificial delay.

The trap: treating the delay as somehow part of what makes `useFormStatus` work — it doesn't; it only makes the effect easier to *see*.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state in one sentence what `useFormStatus` reads and how it decides which form
- [ ] Can explain exactly why same-component placement silently fails, using the ancestor/descendant relationship
- [ ] Can name all four keys `useFormStatus` returns in React 19 and what each represents
- [ ] Can explain why a `SubmitButton` built this way is reusable across unrelated forms with no props
- [ ] Knows this is a post-hydration-only concept with no equivalent during the no-JS fallback path

---
*Next: `useActionState` — `useFormStatus` only tells you a form is busy; this next topic covers getting the action's actual *result* back into the UI, including validation errors, and how its own `pending` value relates to `useFormStatus`'s.*
