# `useOptimistic` for Optimistic UI

**Demo:** `app/playground/phase-05-server-actions/05-use-optimistic` — run `npm run dev`, visit
`/playground/phase-05-server-actions/05-use-optimistic`. Sending a normal message shows it immediately,
dimmed, before the ~1.2s server round trip resolves; sending one containing "fail" shows the optimistic
entry appear and then get reverted when the server rejects it.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `useOptimistic(state, updateFn)` | A second, temporary view of `state` that can diverge from it inside a transition | Lets the UI show a change before the server has confirmed anything |
| `addOptimisticMessage(newText)` | Applies `updateFn` to produce the optimistic value, must be called inside a transition | Calling it outside a transition (no pending async work wrapping it) throws |
| The optimistic value after the transition settles | Reverts to whatever `state` (the real prop) actually is | Success *or* failure both end the transition — reversion isn't success-only |
| The `formAction` wrapping `send()` in this demo | A plain client function, **not** a Server Action itself | This is what makes the instant update possible, and what breaks the no-JS fallback for this one form |

## Where Does This Run?

`useOptimistic` is a React hook — client-side only, so its component must be a Client Component. The actual mutation it wraps (`send`, Topic 1's Server Function pattern) still only executes on the server; `useOptimistic` only controls what the *client* renders while that server round trip is in flight.

## What Is This?

Topic 3 and Topic 4 both surface state around a Server Action's real, server-confirmed result — a `pending` boolean, a returned validation object. `useOptimistic` does something different: it lets you render a *guess* at the outcome immediately, before the server has responded at all, then reconciles automatically once the real result (or a real base state update) arrives.

```tsx
const [optimisticMessages, addOptimisticMessage] = useOptimistic<Message[], string>(
  messages,
  (state, newText) => [...state, { id: `optimistic-${Date.now()}`, text: newText }]
)
```

The first argument is the real, current state (here, `messages` — a prop coming from the server-rendered list). The second is an updater function describing how to compute an *optimistic* version of that state given some new input. Calling `addOptimisticMessage(text)` doesn't touch the real `messages` — it produces a temporary value, `optimisticMessages`, that the component renders instead, for as long as the surrounding transition is still in flight.

> **Check yourself:** Does calling the "add optimistic" function change the real `state` value passed as `useOptimistic`'s first argument?

## Why Does It Exist?

Topic 1 established that Server Actions dispatch **sequentially** per client — even a fast mutation has real, unavoidable network latency, and Next.js queues actions rather than firing them in parallel. Waiting out that latency before showing any change at all makes an app feel laggy even when the underlying logic is simple and fast. `useOptimistic` exists to decouple "what the user sees" from "what the server has confirmed" for exactly the cases where you're confident enough in the outcome to show it early — a chat message, a like count, a draft save — while still gracefully reverting if the server disagrees.

## How It Works

### It only exists inside a transition

`addOptimisticMessage` has to be called from inside a transition — in practice, this usually means inside a function passed to `startTransition`, or (as in this demo) inside an `async` function invoked from a form's `action` prop, which React automatically wraps in a transition. [`Thread.tsx`](../../../app/playground/phase-05-server-actions/05-use-optimistic/Thread.tsx)'s `formAction` calls `addOptimisticMessage(text)` synchronously, *then* `await send(text)` — the optimistic value renders immediately because the surrounding transition is already in flight by the time the `await` starts waiting on the network.

### Reversion happens when the transition settles — not only on success

This is the detail worth internalizing over the "happy path only" mental model: `optimisticMessages` reverts back to whatever the real `messages` state is once the transition completes, **regardless of whether the mutation succeeded**. In this demo, sending "fail" produces the exact same immediate optimistic append as any other message — the entry appears, dimmed, exactly the same way — right up until `send` throws, the `catch` block sets an error message, and the transition ends. At that point `optimisticMessages` reverts to the real (unchanged) `messages` list, and the optimistic entry visibly disappears, replaced by the error text. The demo's failure case exists specifically to make this half of the behavior — not just the success half — observable.

### This form is a real client function, not a Server Action — and that has a cost

`formAction` in this demo is a plain `async function`, not `'use server'`-marked. It calls the real Server Action `send` internally, but the function React actually dispatches for the form submission is this client-side wrapper. Inspecting this demo's rendered HTML confirms the consequence directly: the `<form>`'s `action` attribute is literally `javascript:throw new Error('React form unexpectedly submitted.')` — a placeholder React emits specifically for forms whose action can't run without JavaScript. Unlike every prior topic's plain `<form action={someServerAction}>`, this form has **no** progressive-enhancement fallback; without JS, submitting it does nothing useful at all. This is the real, unavoidable tradeoff of `useOptimistic`: showing an optimistic update requires client-side code to call `addOptimisticMessage` synchronously before awaiting the real result, which means the invoking function can't be a bare Server Action reference passed straight to `action` the way Topics 1–4's demos all used it.

## Gotchas

- **Calling the "add optimistic" updater outside of any transition throws.** It's designed to exist only for the lifetime of an in-flight update — calling it from, say, a plain `onClick` with no `startTransition` and no form-action-triggered transition around it is a misuse, not an alternate valid pattern.
- **The optimistic entry doesn't know it's "wrong" until the transition ends — including on failure.** The dimmed message and the eventually-rejected message render identically while in flight; only the `catch` block and the transition settling distinguish them. A UI that doesn't handle the error case (as many quick examples don't) will show the optimistic entry, have it silently vanish on failure, and give the user no explanation why — worth catching in review.
- **Wrapping a Server Action for optimistic use generally forfeits the no-JS form fallback for that interaction**, because the function driving the transition has to run client-side to call the optimistic updater before the real result arrives. This is a genuine, deliberate tradeoff — not an oversight — and worth naming explicitly when choosing whether a given mutation is worth the UX gain.

## Interview Questions

**Q (High): When does the value returned by `useOptimistic` revert to the real state — only on success, or in both success and failure cases?**

Answer: Both. The optimistic value reverts once the surrounding transition settles, regardless of whether the underlying mutation succeeded or threw. On success, the revert typically coincides with the real state having actually updated to match (so the transition feels seamless); on failure, the optimistic value still reverts, but the real state never changed, so the optimistic entry visibly disappears — which is why handling the error case in the UI (not just the happy path) matters.

The trap: assuming `useOptimistic` "commits" the optimistic value permanently once shown, or that reversion only happens as an error-handling special case rather than as the normal end of every transition.

**Q (High): Why does `useOptimistic` require its updater to be called inside a transition, and what's a common way that requirement is satisfied without writing `startTransition` explicitly?**

Answer: The optimistic value is only meaningful for the duration of an in-flight update — React needs to know when that window starts and ends to know when to revert. Calling the updater outside a transition throws, because there's no in-flight work to scope the optimistic value to. In practice, this is often satisfied implicitly: an `async` function passed to a `<form action>` prop is automatically wrapped in a transition by React, so calling the optimistic updater as the first line of that function (before `await`-ing the real mutation) satisfies the requirement without an explicit `startTransition` call.

The trap: not recognizing that a form's `action` function already runs inside an implicit transition, and either wrapping it redundantly or, worse, assuming a plain `onClick` handler provides the same guarantee when it doesn't.

**Q (Medium): The function passed to a `<form action>` that uses `useOptimistic` is often a plain client function that calls a Server Action internally, rather than the Server Action itself. What does this cost, and why is it unavoidable?**

Answer: It costs the form's no-JS progressive-enhancement fallback — React renders such a form's `action` as an inert `javascript:throw` placeholder, since there's no server-reachable action reference to fall back to before hydration. It's unavoidable given the goal: showing an optimistic update requires calling the optimistic updater synchronously, client-side, before awaiting the real mutation's result — a bare `'use server'` reference handed straight to `action` has no way to run that client-side step first.

The trap: treating this as a bug or an implementation oversight, rather than the direct, structural consequence of what optimistic UI requires.

**Q (Medium): What are the two arguments to `useOptimistic`, and what does each control?**

Answer: The first is the real, current state (typically a prop derived from server-rendered data) — the value the optimistic view eventually reverts to. The second is an updater function, `(currentState, optimisticValue) => newOptimisticState`, describing how to compute a temporary optimistic version of that state given some new input — analogous in shape to a reducer, but scoped to one transition's lifetime rather than persisted.

The trap: describing `useOptimistic` as "just a `useState` that resets," missing that its update function is driven by the *real* state as its base on every call, not by the previous optimistic value — so it always computes from ground truth plus the new optimistic input, not from a chain of prior optimistic guesses.

**Q (Low): If `send` in this demo succeeded but never called `revalidatePath`, would the optimistic message still eventually show up correctly after the transition settles?**

Answer: Not reliably from a fresh server read — `revalidatePath` is what causes the server-rendered `messages` list (passed into `useOptimistic` as the real base state) to actually reflect the new message on a subsequent render. Without it, the transition would still end and the optimistic entry would still revert, but it could revert to a `messages` value that doesn't yet include the new message, causing the entry to flicker away instead of settling into place. This is why the demo's `send` action calls `revalidatePath` after writing to the store, same as every mutation since Topic 1.

The trap: treating `useOptimistic` as a self-contained caching mechanism that doesn't depend on the base state actually being kept fresh — it has no memory of what it optimistically showed once the transition ends; it only ever renders real state or a freshly-computed optimistic value derived from real state.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what `useOptimistic`'s two arguments are and what each does
- [ ] Can explain that reversion happens on both success and failure, not success alone
- [ ] Can explain why the updater must be called inside a transition, and one implicit way that's satisfied
- [ ] Can explain why an optimistic-UI form usually can't be wired to a bare Server Action and loses its no-JS fallback as a result
- [ ] Can explain why the base state (not just the optimistic updater) still needs to be kept fresh via revalidation

---
*Next: Revalidating data after a mutation — this topic assumed `revalidatePath` "just works" after a write; the next one is the full decision framework for choosing between `updateTag`, `revalidateTag`, `revalidatePath`, and `refresh` depending on what a given mutation actually needs.*
