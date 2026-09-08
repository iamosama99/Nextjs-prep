# Calling Server Actions from Forms

**Demo:** `app/playground/phase-05-server-actions/02-server-actions-in-forms` — run `npm run dev`, visit
`/playground/phase-05-server-actions/02-server-actions-in-forms`.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `<form action={someAction}>` | React's extension of the native `action` attribute, accepting a function | The form receives a `FormData` object automatically — no `onSubmit`, no manual serialization |
| `formData.get('title')` | Reading one field out of the auto-passed `FormData` | The standard extraction API — no Next.js-specific parsing involved |
| `someAction.bind(null, id)` | Pre-fills the action's first argument before handing it to the form | The bound value becomes a real function argument, never a visible form field |
| `<button formAction={otherAction}>` inside a form with its own `action` | A per-button override of which action fires on submit | One form, several possible mutations — a "Save draft" vs. "Publish" button pair |

## Where Does This Run?

Same split as Topic 1: the form markup and its `action`/`formAction` wiring are just JSX rendered wherever the form lives (server or client). The function itself still only ever executes on the server, triggered as its own request when the form is submitted — nothing about *using* a Server Action in a form changes where the action's body runs.

## What Is This?

Topic 1 covered how a Server Function gets defined. This topic covers the single most common way one gets *invoked*: React extends the native HTML `<form>` element so its `action` prop can be a function instead of only a URL string. Passed a Server Function, `<form action={fn}>` submits by calling that function with the form's `FormData` as its argument — automatically, with no client-side JavaScript required to make the connection.

```tsx
async function createPost(formData: FormData) {
  'use server'
  const title = formData.get('title')
  // ...
}

<form action={createPost}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

This works identically whether the `<form>` lives in a Server Component or a Client Component — the only difference (Topic 1) is whether the action was defined inline right there or imported from a `'use server'` file.

> **Check yourself:** When a form submits to a Server Action, what does the action function receive as its argument, and where does that argument come from?

## Why Does It Exist?

A native `<form>` already has a browser-built-in mechanism for sending structured data to a server with zero JavaScript: it serializes its fields and POSTs them. Server Actions don't replace that mechanism — they plug into it. Instead of a URL, `action` takes a function reference; the browser still does a real form submission (multipart-encoded, carrying the fields plus an encoded reference to which action to call), and only *after* hydration does React additionally intercept the same submit to make it an RPC call instead of a full navigation. This is why forms wired this way work before JavaScript has loaded — the fallback isn't a separate code path someone wrote, it's the same form doing what forms have always done.

## How It Works

### `FormData` arrives already extracted — mostly

The action doesn't need `event.preventDefault()` or reading `event.target`; React hands it a `FormData` built from every named field in the form at submit time. For a form with many fields, `Object.fromEntries(formData)` turns it into a plain object in one line — useful, but the docs flag a genuine gotcha: the resulting object also picks up extra properties prefixed `$ACTION_` (the framework's own action-serialization metadata riding along in the same submission), so spreading it blindly into, say, a database write without picking specific fields first can leak those alongside your real data.

### `bind()` for arguments that aren't form fields

Not everything an action needs comes from a visible input. [`PostList.tsx`](../../../app/playground/phase-05-server-actions/02-server-actions-in-forms/PostList.tsx) binds each post's `id` to `saveDraft`, `publish`, and `upvotePost` before handing them to a form: `saveDraft.bind(null, post.id)`. `bind` is plain JavaScript, not a Next.js API — it works identically here to binding any other function, and it's inspectable proof of the mechanism: it produces a real serialized argument (verified for this topic's demo — the rendered HTML embeds the bound post id as encoded action metadata, not as a plain form field an end user could tamper with via browser devtools the way a hidden `<input>` could be edited).

The docs note the alternative — a hidden `<input type="hidden" name="userId" value={userId} />` — and why `bind` is usually preferable: a hidden input's value is plain, unencoded HTML the user can inspect and modify before submitting, while a bound argument travels as part of the action's own encoded reference. Neither replaces a real ownership check inside the action (Topic 7) — `bind` only controls what argument *shape* reaches the function, not whether the caller is entitled to act on that argument.

### One form, several actions: nested form elements

A `<button>`, `<input type="submit">`, or `<input type="image">` nested inside a form can carry its own `formAction`, overriding the form's action for just that button's click. The demo's "Save as draft / Publish" pair is exactly this: the `<form>`'s own `action` is `saveDraft` (what fires on a plain Enter-key submit), and the "Publish" button's `formAction` is `publish` — same form, same fields, a different Server Function depending on which button the user actually clicked.

### Programmatic submission

Outside of a click, you can trigger the same form submission in code via the DOM's `requestSubmit()` method — the docs' example listens for a `⌘`/`Ctrl`+Enter keydown in a `<textarea>` and calls `e.currentTarget.form?.requestSubmit()`. This still goes through the exact same form/action machinery described above; it's a different trigger, not a different invocation path.

```tsx
'use client'
function Entry() {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }
  return <textarea name="entry" onKeyDown={handleKeyDown} />
}
```

> **Check yourself:** Why is binding a value with `.bind()` generally preferable to putting it in a hidden `<input>`, and what security question does neither approach answer on its own?

## Not to Be Confused With

`next/form` (the `<Form>` component) also extends `<form>`, but for a different job entirely: client-side navigation with prefetching, aimed at forms that update URL search params (a search box submitting to `/search?query=...`). It doesn't call a Server Action — its `action` is a URL string. Reach for a plain `<form action={serverFunction}>` for mutations (this topic); reach for `next/form` for GET-based navigation driven by form input (Phase 11 territory).

## Gotchas

- **`Object.fromEntries(formData)` includes framework-internal `$ACTION_`-prefixed properties**, not just your named fields — don't spread the raw result into a database write without picking the specific keys you expect.
- **A value passed via `bind()` is still client-influenceable in principle** — the *identity* of which post to act on can be trusted more than a hidden input (it's not casually editable in devtools), but it is still, ultimately, information that originated from what was rendered to that specific client. It tells the action *which* resource the user claims to be acting on; it is never a substitute for checking that the authenticated caller is actually allowed to act on that resource (Topic 7).
- **`bind()`'s bound arguments come *before* the automatic `FormData` argument.** `saveDraft(id: string)` bound via `saveDraft.bind(null, post.id)` still implicitly ends up as `(id, formData)` if the form also has named fields — order matters and is easy to get backwards when an action is used both bound and unbound elsewhere.

## Interview Questions

**Q (High): What does a Server Function passed to `<form action>` actually receive when the form submits, and how does that differ from a traditional `onSubmit` handler?**

Answer: It receives a `FormData` object built automatically from the form's named fields — no `event.preventDefault()`, no manually reading `event.target` or constructing `FormData` yourself. A traditional `onSubmit` handler in a Client Component has to do all of that serialization work itself; the Server Action form of `action` gets it for free as part of React's extension of the native `<form>` element.

The trap: describing this as "just like a normal onSubmit" without naming that the serialization is automatic and framework-provided, not something the developer wires up.

**Q (High): How does `.bind()` let you pass an argument to a Server Action that isn't a visible form field, and why might that be preferable to a hidden input?**

Answer: `someAction.bind(null, value)` is plain JavaScript function binding — it produces a new function with `value` pre-filled as the first argument, and that bound function can be handed directly to `action` or `formAction`. Passed this way, the value travels as part of the action's own encoded reference rather than as plain, user-editable HTML the way a hidden `<input>`'s value would be. It's harder to casually tamper with in devtools, though it still isn't a substitute for an authorization check inside the action itself.

The trap: presenting `bind()` as a security mechanism on its own, rather than as one input-integrity improvement over hidden inputs that still requires a real ownership check server-side.

**Q (Medium): A form has a default `action` and one button with its own `formAction`. What determines which Server Function actually runs when the user submits?**

Answer: Which element triggered the submission. A plain Enter-key submit (or clicking a button with no `formAction` of its own) uses the form's default `action`. Clicking specifically the button that has `formAction` set overrides the form's default and invokes that button's action instead — same form, same field values, different function, purely based on which control the user activated.

The trap: assuming a form can only ever call one action, and reaching for multiple separate `<form>` elements when nested `formAction` on individual buttons is the documented, simpler pattern for exactly this case (e.g., "Save draft" vs. "Publish").

**Q (Medium): What extra properties show up if you call `Object.fromEntries(formData)` on a form submitted to a Server Action, beyond the fields you actually named?**

Answer: Properties prefixed `$ACTION_` — internal metadata the framework embeds in the same submission to identify and serialize the action call itself. They ride along in the same `FormData`, so spreading the `Object.fromEntries` result directly into application logic (a database write, for instance) without selecting specific expected keys risks passing that internal metadata through as if it were real form data.

The trap: not knowing this artifact exists and being surprised by unexpected keys when debugging a form handler, or worse, not noticing them and shipping code that trusts the raw spread.

**Q (Low): Can you trigger a Server-Action-backed form submission without a user clicking a submit button?**

Answer: Yes — the DOM's `requestSubmit()` method (e.g., `formElement.requestSubmit()`) triggers the same submission pipeline as a real click, and can be called from any event handler, such as a keyboard shortcut. It still goes through the identical form/action machinery; it's a different trigger for the same mechanism, not a separate way of invoking the action.

The trap: assuming programmatic submission requires bypassing the form and calling the Server Action directly as a plain async function — `requestSubmit()` keeps the form-based path (and its progressive-enhancement properties) intact.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what argument a Server Action bound to `<form action>` receives and where it comes from
- [ ] Can write a form that binds an extra id argument to an action with `.bind()`
- [ ] Can explain why `bind()` is generally preferable to a hidden input for passing non-field data
- [ ] Can wire two buttons in one form to two different Server Functions via `formAction`
- [ ] Knows the `$ACTION_`-prefixed properties gotcha with `Object.fromEntries(formData)`
- [ ] Can distinguish a plain `<form action={serverFunction}>` from `next/form`'s `<Form>` component by use case

---
*Next: `useFormStatus` & pending states — every form here submits with no visible feedback while the action runs; this next topic is the first-line fix, reading a form's in-flight status from a child component without any state wiring of your own.*
