# Passing Data Across the Server/Client Boundary

**Demo:** `app/playground/phase-04-server-components-data/08-serialization-boundary` — run `npm run dev`, visit `/playground/phase-04-server-components-data/08-serialization-boundary`. Has an exercise for triggering a real serialization error.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| Primitives, plain objects, arrays, `Date`, `Map`, `Set`, rendered React elements | Serializable — can cross as props | The same rule set Phase 3, Topic 5 covered for `"use cache"` boundaries |
| Class instances, functions, `Symbol`, `WeakMap`/`WeakSet`, `URL` | **Not** serializable | Passing these as props from Server to Client throws |
| A function marked `'use server'` | The one function-shaped exception | Crosses as a reference the client can invoke — Server Actions, Phase 5 |
| A full database row passed straight to a Client Component | Technically serializable, practically a leak | Serializability is a floor, not a security review |

## Where Does This Run?

This is about what crosses the server/client boundary as **data** (via props), which is a different question from what crosses as **code** (via imports — Topic 2) or where a given component's code physically executes (Topic 1). All three questions have different answers and different enforcement mechanisms.

## What Is This?

A Server Component can compute or fetch anything; a Client Component can only receive, as props, values React knows how to serialize into the RSC Payload and reconstruct in the browser. This is the *same* serialization system Phase 3, Topic 5 described for `"use cache"` cache keys and outputs — Server Component argument rules going in, Client Component prop rules coming out — applied here specifically to props crossing from a Server Component into a Client Component.

**Serializable:** primitives (`string`, `number`, `boolean`, `null`, `undefined`), plain objects, arrays, `Date`, `Map`, `Set`, typed arrays, and — specifically for this direction — rendered React elements (which is what makes the `children`-as-slot pattern from Topic 3 work at all).

**Not serializable:** class instances, plain functions, `Symbol`, `WeakMap`/`WeakSet`, `URL` instances. Passing any of these as a prop from a Server Component to a Client Component throws.

> **Check yourself:** Without looking, explain why a plain `onClick` handler can't be passed from a Server Component to a Client Component as a prop, but a `'use server'`-marked function can.

## Why Does It Exist?

The RSC Payload is a serialized description of the tree, sent over the wire (or embedded in HTML) and reconstructed by React in the browser — anything crossing that boundary has to survive being turned into that serialized form and back. A live class instance, with its prototype chain and methods, or a plain function closing over server-side state, has no meaningful serialized representation the browser could reconstruct. `'use server'` functions are the deliberate exception: rather than serializing the function itself, React serializes a *reference* to it, which the client can later invoke by triggering a new request back to the server (Phase 5 covers the mechanics).

## How It Works

### Serializable doesn't mean "safe to send"

This is the sharpest distinction in this topic, and it's easy to miss because it sounds like the same concern. A full database row — `{ id, name, email, passwordHash, internalNotes }` — is entirely serializable (it's a plain object of primitives). Passing it wholesale to a Client Component compiles fine, runs fine, and ships every field to the browser regardless of whether the UI displays them:

```tsx
// BAD: technically valid, practically a leak
export default async function Page({ params }) {
  const { slug } = await params
  const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`
  return <Profile user={rows[0]} /> // ships passwordHash, everything
}
```

```tsx
'use client'
// BAD props interface: accepts far more than the UI needs, and
// encourages the Server Component above to keep passing everything
export default function Profile({ user }: { user: User }) {
  return <h1>{user.name}</h1>
}
```

The fix isn't a serialization rule — it's shaping the data *before* it's passed, the DTO discipline Topic 4 introduced for the Data Access Layer pattern:

```ts
// GOOD: return only public fields
export async function getUser(slug: string) {
  const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`
  return { name: rows[0].name } // nothing else exists to leak
}
```

```tsx
export default async function Page({ params }) {
  const { slug } = await params
  const publicProfile = await getUser(slug)
  return <Profile user={publicProfile} />
}
```

Now there's nothing sensitive in the object at all — not because a serialization rule caught it, but because it was never fetched into that object's shape in the first place.

### Tainting: a backstop, not the first line of defense

React's Taint APIs — `experimental_taintObjectReference` (for whole objects) and `experimental_taintUniqueValue` (for specific values, like a token string) — let you explicitly mark a value as forbidden from crossing into a Client Component, causing a runtime error if something tries. Enable them with `experimental.taint` in `next.config.js`. These exist as an *additional* layer of protection, not a substitute for DTO discipline — you should still shape and filter data in the DAL before it ever reaches render, and reach for tainting as a deliberate backstop against a mistake slipping past that discipline, not as the primary mechanism.

### Server Functions cross as references, not values

A `'use server'`-marked function is the one function-shaped value allowed across the Server-to-Client boundary — not because it's magically serializable, but because React treats it specially: what actually crosses is a reference the client can later invoke, which triggers a real request back to the server rather than executing anything client-side. A plain function has no such special handling and simply throws when passed as a prop.

> **Good to know:** A Server Function isn't distinguishable from a plain function purely by its runtime type. Next.js's TypeScript plugin allows a Client Component prop typed as a function specifically when its name is `action` or ends in `Action`, and flags other function-typed props — a naming convention doing double duty as a lightweight type-safety signal.

## Gotchas

- **The error for an unserializable prop is a runtime error at render, not a type error you'll always catch ahead of time**, unless your types are precise. A prop typed loosely as `any` or a broad interface can compile fine and only fail when the Client Component actually renders with a class instance or function in that slot.
- **DTO shaping has to happen in the function that fetches the data, not "eventually" before rendering.** Fetching a full row and filtering it in the Client Component itself doesn't help — by the time a Client Component has the data to filter, it already crossed the wire in full.
- **Broad prop types on Client Components invite over-passing.** A `Profile({ user }: { user: User })` signature accepting the *entire* `User` type, when the component only renders `name`, makes it easy for whoever calls `<Profile>` next to pass the full object out of convenience — a narrower prop type (`{ name: string }`) makes over-passing a type error instead of a silent habit.

## Interview Questions

**Q (High): A Server Component fetches a full database row and passes it directly to a Client Component as a prop. The build succeeds and the page works. Is there a problem?**

Answer: Yes — every field in that row, including ones the UI never displays (password hashes, internal flags, other users' data if the query was too broad), ships to the browser as part of the serialized RSC Payload, because the object is fully serializable and nothing about serialization rules cares whether a field is *sensitive*, only whether it's *representable*. The fix is shaping the data before it's passed — a DAL function returning a minimal DTO with only the fields the UI actually needs — not a serialization-level check, since serializability and safety are orthogonal properties of the same object.

The trap: treating "it built and ran without errors" as evidence of safety — serialization succeeding says nothing about whether the data should have been sent at all.

**Q (High): Why can a `'use server'`-marked function be passed as a prop to a Client Component when a plain function throws in the same position?**

Answer: React doesn't actually serialize the function's code either way — a plain function has no serializable representation at all and throws. A `'use server'` function gets special handling: React serializes a *reference* to it instead, which the Client Component can later invoke, and invoking it triggers a genuine new request back to the server rather than running anything client-side. It's not that Server Functions are "more serializable" — it's that they cross via an entirely different mechanism (a callable reference) than ordinary data does.

The trap: describing this as "Server Actions are serializable functions" — they aren't serialized as functions at all; they cross as references, which is a distinct concept from serializing function code (which remains impossible).

**Q (Medium): What's the difference between React's Taint APIs and simply not fetching sensitive fields in the first place — why would you need both?**

Answer: Not fetching sensitive fields (DTO shaping in a DAL) is the primary defense — if a field was never retrieved, there's nothing for any mechanism to accidentally leak. Taint APIs (`taintObjectReference`, `taintUniqueValue`) are a backstop for cases where a sensitive value genuinely does exist somewhere in scope (perhaps for a server-side check) and you want an explicit, enforced guarantee that *this specific value* can never end up in a Client Component's props, even if a future code change accidentally tries. They complement, rather than replace, careful data shaping — tainting exists precisely because discipline alone doesn't scale perfectly across a large, changing codebase.

The trap: treating tainting as sufficient on its own, or as unnecessary once DTOs are in place — the recommended posture is both: shape data conservatively, and taint anything genuinely sensitive that still passes through server-side code as extra insurance.

**Q (Medium): A Client Component prop is typed as `{ onSave: () => void }` and a Server Component tries to pass a plain (non-`'use server'`) function for it. What happens?**

Answer: It throws — plain functions aren't serializable, and there's no exception for "the function doesn't do anything server-sensitive." The only function-shaped value that can cross is one explicitly marked `'use server'`, which crosses as an invocable reference rather than as serialized function code. A genuinely client-side-only callback (with no server-side effect) belongs entirely within Client Component code — defined and passed between Client Components, never originating from a Server Component prop.

The trap: assuming "this function is harmless, so it should be allowed across" — the restriction isn't about the function's safety, it's a hard structural fact about what RSC serialization can represent at all.

**Q (Low): Why does Next.js's TypeScript plugin treat a Client Component prop named `action` or ending in `Action` specially?**

Answer: Because a Server Function is, at the type level, indistinguishable from a plain function — both have a function type signature. The naming convention (`action`, `*Action`) is a lightweight, opt-in signal the TypeScript plugin recognizes to allow function-typed props through without flagging them, while still catching genuinely mistaken plain-function props with other names. It's a convention-based workaround for a real type-system limitation, not a runtime requirement — the actual enforcement happens at render/build time regardless of naming.

The trap: assuming the naming convention is what makes a Server Function work at runtime — it doesn't; `'use server'` is what does that. The naming convention only affects whether your editor/type-checker warns you ahead of time.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can name what's serializable and what isn't when passing props from Server to Client Components
- [ ] Can explain why "serializable" and "safe to send" are different properties of the same value
- [ ] Can explain how a Server Function crosses the boundary differently from a plain function
- [ ] Can explain when Taint APIs add value beyond DTO-shaped data access
- [ ] Can write the bad (full row) vs. good (DTO) version of passing data to a Client Component

---
*Next: Wrapping third-party client-only libraries — a very concrete application of everything from Topics 1–8: what to do when a library you didn't write assumes it can be used directly in a Server Component and breaks.*
