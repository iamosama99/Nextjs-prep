# `error.tsx` & Error Boundaries Per Route Segment

## Quick Reference

| Fact | Detail |
|---|---|
| Component type | **Must** be a Client Component — requires `'use client'` |
| Props received | `error: Error & { digest?: string }`, `reset: () => void` |
| Scope | Catches errors in the segment **below** it — not in the `layout.tsx` at its own level |
| Root-level errors | Caught by `global-error.tsx`, which must supply its own `<html>`/`<body>` |
| Production error messages | Redacted to a `digest` string by default — the real message/stack isn't sent to the client |

## Where Does This Run?

The boundary mechanism itself is a client-side React concept (error boundaries are implemented via class-component lifecycle methods, which have no Server Component equivalent) — but it catches errors regardless of whether they originated during server rendering or client rendering/interaction within its scope.

## What Is This?

An `error.tsx` file automatically wraps its route segment in a React error boundary: if anything in that segment throws during rendering — a failed data fetch, a thrown exception in a Server or Client Component — `error.tsx` renders instead of that broken subtree, rather than the failure propagating up and taking down more of the page than necessary.

> **Check yourself:** If `app/dashboard/settings/error.tsx` exists and something throws inside `app/dashboard/settings/page.tsx`, does the rest of `/dashboard` (the sidebar, other panels) stay interactive, or does the whole `/dashboard` route go down too?

## Why Does It Exist?

Pages Router had one global `_error.tsx` — any unhandled error, anywhere, took over the entire page with a single generic error UI, with no way to contain the blast radius to just the broken section. That's a poor experience for anything resembling a dashboard or multi-panel app: one failing widget shouldn't make the whole page unusable. `error.tsx`'s per-segment scoping directly mirrors `loading.tsx`'s per-segment scoping (Topic 9) — the same idea (isolate a route segment's failure/pending states) applied to errors instead of pending states, so a broken analytics panel can show its own inline error UI while the rest of the dashboard keeps working.

## How It Works

```tsx
// app/dashboard/settings/error.tsx
'use client';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Something went wrong loading settings.</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

**`error.tsx` must be a Client Component** because error boundaries are implemented using React lifecycle methods (`componentDidCatch`/`getDerivedStateFromError`-equivalent machinery) that only exist for components running on the client — there's no Server Component equivalent of catching a render-time error this way, so Next.js requires `'use client'` here explicitly rather than trying to make it work invisibly.

**The `reset` function** attempts to re-render the segment that errored, effectively giving the user a retry button without a full page reload — useful when the failure was transient (a flaky network request) rather than a deterministic bug.

**`error.digest`, not the full error, is what you get in production.** Next.js strips detailed error messages and stack traces from what's sent to the client in production builds, replacing them with a `digest` — a short identifier you can correlate against server-side logs to find the actual underlying error. This is a deliberate security boundary: server-side error details (which might include internal paths, query fragments, or other implementation detail) shouldn't leak to whoever's browser happened to trigger the failure.

**The scoping rule that trips people up most:** `error.tsx` at a given segment catches errors in that segment's `page.tsx` and anything nested *below* it — but **not** errors thrown by the `layout.tsx` at that exact same level. A layout and its `error.tsx` sibling are conceptually parents of the same boundary; the error boundary can't catch a throw from something that (architecturally) wraps it. To catch a root layout's own errors, you need the special `global-error.tsx` file, which — because it effectively replaces the entire root layout when active — must define its own `<html>`/`<body>`, just like the root layout normally does.

> **Check yourself:** Why can't `app/dashboard/error.tsx` catch an error thrown inside `app/dashboard/layout.tsx` itself, even though they live in the same folder?

## Gotchas

- **Forgetting `'use client'`** on `error.tsx` is an immediate, obvious build/runtime error — but it's a common first-time mistake for anyone assuming every special file defaults to Server Component like `page.tsx` and `layout.tsx` do.
- **Expecting `error.tsx` to catch its sibling layout's errors.** It only catches errors from `page.tsx` and below — a bug in the layout itself needs either a parent segment's `error.tsx` (one level up) or, for the root layout specifically, `global-error.tsx`.
- **Expecting the real error message/stack in production.** Relying on `error.message` showing anything useful to an end user (or even to you, debugging via a screenshot) in production is a dead end by design — the `digest` is meant to be looked up against server logs, not read as a human-readable explanation.

## Interview Questions

**Q (High): Why must `error.tsx` be a Client Component?**

Answer: React error boundaries are implemented via lifecycle methods (effectively `componentDidCatch`/`getDerivedStateFromError`) that exist only in the client component model — there's no Server Component equivalent for catching a render-time error this way. Next.js requires the explicit `'use client'` directive on `error.tsx` because the boundary genuinely can only function as client-side machinery, regardless of whether the error it's catching originated during server or client rendering.

The trap: assuming this is an arbitrary Next.js rule rather than a direct consequence of how React error boundaries are actually implemented.

**Q (High): Does an `error.tsx` at a given segment catch errors thrown by the `layout.tsx` at that same segment level? Why or why not?**

Answer: No — `error.tsx` only catches errors from its segment's `page.tsx` and anything nested below it, not from the sibling `layout.tsx` at the identical level, because the layout architecturally sits above/around that boundary rather than inside it. Catching a root layout's own error requires the special `global-error.tsx` file instead, which must supply its own `<html>`/`<body>` since it effectively takes over the root layout's job when it activates.

The trap: assuming any file in the same folder as `error.tsx` is automatically within its catch scope — the layout at that level specifically is not.

**Q (Medium): What's `global-error.tsx` for, and why does it need its own `<html>`/`<body>`?**

Answer: It's the only mechanism that can catch an error thrown in the root layout itself, since no ordinary `error.tsx` can reach that high. Because it activates by effectively replacing the entire root layout (the one place that would otherwise own `<html>`/`<body>`), it has to render those tags itself — there's nothing else left rendering the document shell if it's in use.

The trap: not knowing this file exists, or expecting a regular nested `error.tsx` to eventually catch a root-layout-level failure given enough nesting.

**Q (Medium): What does the `reset()` function passed to `error.tsx` actually do?**

Answer: It attempts to re-render the segment that errored — effectively a retry — without requiring a full page reload. It's appropriate for transient failures (a flaky request) rather than a guaranteed fix for a deterministic bug, since re-rendering with the same inputs will simply produce the same error again if the underlying cause hasn't changed.

The trap: assuming `reset()` reloads the whole page, or that it somehow fixes the underlying error rather than just retrying the render.

**Q (Medium): Why does the `error` object passed to `error.tsx` often show a generic digest instead of the real error message in production?**

Answer: Next.js redacts detailed error messages and stack traces from client-facing output in production builds by default, exposing only a `digest` identifier meant to be cross-referenced against server-side logs. This prevents potentially sensitive server-side implementation details from leaking to an end user's browser simply because something failed.

The trap: treating the digest-only behavior as a bug or missing feature rather than a deliberate security-conscious default.

**Q (Low): How does nested `error.tsx` scoping prevent one broken component from taking down the whole app?**

Answer: Because each route segment can have its own `error.tsx`, a failure is caught at the nearest boundary above where it occurred — a broken panel deep in a dashboard renders its own local error UI, while everything outside that segment (sibling panels, the layout, parent routes) remains mounted and interactive, rather than the entire page unmounting the way a single global error page would force.

The trap: describing this in the abstract without connecting it to the concrete mechanism — nearest-ancestor-boundary catching, per segment.

---

## Self-Assessment

- [ ] Can explain, without notes, why `error.tsx` specifically requires `'use client'`
- [ ] Can state that `error.tsx` doesn't catch errors from its own segment's sibling `layout.tsx`
- [ ] Knows what `global-error.tsx` is for and why it needs its own `<html>`/`<body>`
- [ ] Can describe what `reset()` does and when it's actually useful vs. not
- [ ] Can explain why production error messages are redacted to a digest, and why that's a security boundary, not a limitation

---
*Next: `not-found.tsx` & `notFound()` — the sibling convention for "this doesn't exist" instead of "this broke," including why it's a Server Component while `error.tsx` is a Client Component.*
