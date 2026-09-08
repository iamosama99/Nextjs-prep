# Server Action Security

**Demo:** `app/playground/phase-05-server-actions/07-server-action-security` — run `npm run dev`, visit
`/playground/phase-05-server-actions/07-server-action-security`. Every vulnerability described below was
triggered for real, not just described: logged in as a non-admin user via curl, the "unsafe" wipe action
and the "unsafe" delete action both succeeded exactly as a real attacker's would; the "safe" versions both
correctly rejected the same requests with a 500. A forged `Origin` header against a real action was also
confirmed rejected with `"Invalid Server Actions request."`

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A page-level `if (!session) redirect(...)` | Gates what gets *rendered* | Does **not** gate the Server Actions defined or used on that page — they're separate, directly reachable entry points |
| `auth()` called again inside the action | The only check that actually gates *this* entry point | Verified for real: an "unsafe" action with no such check executed successfully for a logged-in non-admin user |
| `if (doc.ownerId !== user.id) throw ...` | Authorization (not just authentication) | Verified for real: without it, one logged-in user deleted another user's document (IDOR) |
| A forged `Origin` header on a direct POST | Rejected automatically, framework-level | Confirmed: same request with a mismatched `Origin` got `"Invalid Server Actions request."` where a matching one succeeded |

## Where Does This Run?

Entirely server-side — every check this topic covers (auth, authorization, origin validation) happens as part of the action's own request execution, independent of whatever UI happened to render the button that normally triggers it.

## What Is This?

Topic 1 established the foundational fact this entire topic is built on: defining a Server Function compiles it to a real POST endpoint, reachable directly, "not just through your application's UI." Every topic since has quietly built real mutations without dwelling on that fact. This topic is where it stops being a footnote: what does "reachable directly" actually mean in practice, and what has to happen inside an action — not around it — to make that safe?

> **Check yourself:** If a page redirects unauthenticated users away before rendering a "Delete" button, is the Server Action that button would have called also protected from unauthenticated callers?

## Why Does It Exist?

A page-level check answers "should this UI render for this user?" A Server Action is a separate network entry point with its own answer to a different question: "should *this specific request* be allowed to execute?" Nothing connects those two answers automatically — they're resolved by different code, at different times, and (critically) a request to the action's endpoint doesn't have to originate from the page at all. Security work on Server Actions exists specifically to close that gap: to make sure the action's own answer is correct regardless of what any particular page's rendering logic decided.

## How It Works — Verified, Not Just Described

### A page-level check does not extend to the action — proven

This topic's demo defines `wipeRecordsUnsafe` (no check at all) and `wipeRecordsSafe` (re-verifies `user.isAdmin`) side by side. The page only *renders* an explanatory note when the current user isn't an admin — it doesn't hide the vulnerable button, deliberately, so the point is undiluted. Logged in as Bob (not an admin, confirmed via a real session cookie set by the demo's own `login` action), a raw POST straight to `wipeRecordsSafe` correctly failed with a 500 (`Unauthorized: admin only.`) and left the underlying state untouched. The exact same non-admin session, POSTed to `wipeRecordsUnsafe` instead, **succeeded** — the "records wiped" flag flipped to `true` for a user with no business triggering it. Nothing about the page's rendering logic was involved in either request; only the code inside each action decided the outcome.

### Authentication isn't authorization — also proven, not just asserted

A second, sharper version of the same gap: `deleteDocUnsafe` checks nothing — not even that a session exists — and deletes whatever `id` it's given. `deleteDocSafe` checks both that a session exists *and* that `doc.ownerId === user.id`. Logged in as Bob, a direct POST to `deleteDocSafe` targeting Alice's document (`d1`, owned by `alice`) correctly failed and left the document in place. The same request against `deleteDocUnsafe` **succeeded** — Bob deleted Alice's private document outright. This is a textbook [Insecure Direct Object Reference (IDOR)](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html): the action trusted a client-supplied id as sufficient permission to act on that resource, rather than as merely *which* resource the caller is claiming to act on. The fix isn't "check the user is logged in" (that alone still permits this exact attack, since Bob genuinely is logged in) — it's checking that the specific authenticated caller owns the specific resource named by the id.

### Framework-level CSRF protection — also confirmed directly

Beyond what a developer writes, Next.js enforces its own baseline check: it compares the request's `Origin` header against `Host` (or `X-Forwarded-Host`), and rejects a mismatch. A same-origin POST to this demo's `logout` action succeeded normally; the identical request with `Origin: http://evil.example.com` instead of the real origin failed immediately with `"Invalid Server Actions request."` — before the action's own code ever ran. Because actions are POST-only, and modern browsers pair this with `SameSite` cookies by default, this closes off most classic CSRF vectors without any code the developer has to write. It's a real, load-bearing protection — and also explicitly not a substitute for authentication/authorization inside the action, since it does nothing to stop a legitimately-authenticated attacker (like Bob, above) from calling an action they shouldn't be able to.

### Encrypted action IDs and dead code elimination

Two more framework-level protections, from Topic 1: action references are encrypted, non-deterministic, and rotated periodically between builds, and any `'use server'`-exported function never actually referenced anywhere in the app is stripped from the client bundle entirely at build time, so it never becomes a public endpoint in the first place. Both raise the bar for a would-be attacker (they can't easily enumerate or guess valid action IDs, and truly-unused code isn't exposed at all), but neither substitutes for the checks demonstrated above — every genuinely-used action remains a real POST endpoint, reachable by anyone who has (or can discover) its ID.

### The Data Access Layer pattern

Repeating auth and ownership checks inside every single action invites the exact mistake this topic demonstrates — one action that forgets the check. The recommended pattern centralizes this: a `server-only`-marked Data Access Layer module does the actual database work, performs authentication and authorization itself, and the `'use server'` action becomes a thin wrapper that delegates to it:

```ts
// data/posts.ts — server-only, not itself a Server Action
import 'server-only'
import { auth } from '@/lib/auth'

export async function deletePost(postId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const post = await db.post.findUnique({ where: { id: postId } })
  if (post.authorId !== session.user.id) throw new Error('Forbidden')
  await db.post.delete({ where: { id: postId } })
}
```

```ts
// app/actions.ts — thin, delegates entirely
'use server'
import { deletePost } from '@/data/posts'
import { revalidatePath } from 'next/cache'

export async function deletePostAction(postId: string) {
  await deletePost(postId) // auth + authz live here, once
  revalidatePath('/posts')
}
```

This doesn't remove the need for the check — it removes the need to *remember* the check separately in every action that touches the same resource.

### Controlling return values

A Server Action's return value is serialized straight to the client — returning a raw database record risks leaking internal fields (password hashes, internal flags, other users' data nested in a relation) that the UI never needed. The fix is shaping the return to exactly what the caller should see, the same DTO discipline Phase 3/4 material already established for reads, applied here to writes.

## Gotchas

- **A page-level `redirect()` for unauthorized users protects the *render*, not the action.** This is the single most important, most concretely-demonstrated fact in this topic — verified with a real bypass, not asserted from documentation.
- **"The user is authenticated" and "the user is allowed to do this to this specific resource" are two different questions**, and an action that only answers the first is still exploitable exactly the way this topic's IDOR demo shows.
- **`bind()`-ing an id to an action (Topic 2) controls what argument shape reaches the function — it doesn't grant permission.** The id still has to be checked against the caller's actual ownership inside the action; `bind` only makes the id harder to casually tamper with in devtools than a plain hidden input would, nothing more.
- **CSRF protection (the Origin/Host check) stops forged cross-site requests, not legitimately-authenticated misuse.** Bob's IDOR attack in this demo came from Bob's own, genuine, same-origin session — CSRF protection has nothing to say about it.
- **Mutations must never happen as a side effect of rendering** — Next.js explicitly prevents setting cookies or triggering revalidation inside a render path for exactly this reason; a mutation belongs in a Server Action, always.

## Interview Questions

**Q (High): A page calls `redirect('/login')` if there's no session before rendering an admin panel with a "Delete all records" button. Is the Server Action behind that button protected from an unauthenticated request?**

Answer: No. The redirect only controls what gets rendered on that page — it has no effect on the Server Action itself, which is a separately reachable POST endpoint. Anyone who knows or can discover the action's reference can call it directly, bypassing the page (and its redirect) entirely. This was verified directly in this topic's demo: a non-admin session, given no UI path to the "unsafe" button, still successfully triggered it via a direct POST.

The trap: treating a page-level auth gate as if it were a security boundary for everything defined on that page, rather than recognizing each Server Action as its own independent entry point requiring its own check.

**Q (High): What's the difference between authentication and authorization in the context of a Server Action, and why does checking only the first still leave a real vulnerability?**

Answer: Authentication answers "is this a real, logged-in user?" Authorization answers "is *this specific* user allowed to act on *this specific* resource?" An action that checks only authentication (confirms a session exists) but not ownership will still execute for any logged-in user acting on any resource, including ones they don't own — an IDOR vulnerability. This topic's demo proved it concretely: a genuinely logged-in, non-admin user (no forged session, no CSRF) was still able to delete another user's document through an action that checked authentication but not ownership.

The trap: treating "the user is logged in" as sufficient justification to proceed with a mutation, without separately verifying that the logged-in user actually owns or is permitted to act on the specific resource identified by a client-supplied id.

**Q (Medium): Why isn't Next.js's built-in Origin/Host CSRF check sufficient protection for a Server Action on its own?**

Answer: The Origin/Host check defends against forged *cross-site* requests — it verifies the request genuinely originated from the same site, not a malicious third-party page tricking a victim's browser into submitting it. It says nothing about whether a legitimately-authenticated, same-origin caller is *permitted* to perform the specific action they're requesting. This topic's IDOR demo used a real, same-origin, non-forged session the entire time — the CSRF check would have let every one of those requests through, because none of them were cross-site forgeries; the missing protection was authorization, a completely separate concern.

The trap: conflating CSRF protection with authorization, or assuming that because Next.js "handles security" at the framework level, application-level auth/authz checks become optional.

**Q (Medium): What does routing a mutation through a Data Access Layer actually buy you, if the auth/authorization check still has to exist somewhere?**

Answer: It doesn't remove the need for the check — it centralizes it, so the check exists exactly once per resource type rather than being re-implemented (and potentially re-forgotten) in every Server Action that happens to touch that resource. A thin `'use server'` action delegating to a `server-only` DAL function inherits that function's auth/authorization guarantee automatically, rather than depending on every action author remembering to re-derive it. This directly addresses the failure mode this topic demonstrated: an action that simply forgot the check.

The trap: describing the DAL pattern as adding a new security capability, rather than as an organizational fix for the "one action forgot the check" failure mode specifically.

**Q (Low): Why does Next.js strip unused `'use server'`-exported functions from the client bundle at build time, and does that make an unused action's server-side code safe to skip authorization on?**

Answer: Dead code elimination removes any `'use server'` export never actually referenced anywhere in the app, so it never becomes a reachable public endpoint at all — reducing accidental exposure of code exported but not genuinely used. It does not change anything about functions that *are* referenced: any action actually wired into the app remains a real, directly-callable POST endpoint requiring its own authorization checks, regardless of how "internal" the developer considers it.

The trap: assuming this build-time optimization is a security feature that reduces the need for authorization checks on used code — it only helps with the narrower case of genuinely unreferenced code.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain, with a concrete example, why a page-level redirect doesn't protect the action behind a button on that page
- [ ] Can distinguish authentication from authorization and explain why checking only the former still allows IDOR
- [ ] Can explain what the Origin/Host CSRF check actually defends against, and what it does *not* defend against
- [ ] Can describe the Data Access Layer pattern and what specific failure mode it addresses
- [ ] Knows encrypted action IDs and dead code elimination are real but partial protections, not substitutes for in-action checks

---
*Next: Progressive enhancement — this phase has repeatedly claimed forms "work without JavaScript"; this final topic verifies exactly what that means, what breaks it (Topic 5's `useOptimistic` wrapper, Topic 1's `onClick`-invoked action), and how to test it properly.*
