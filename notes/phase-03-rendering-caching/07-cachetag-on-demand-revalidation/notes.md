# `cacheTag`, `revalidateTag` & `updateTag` — On-Demand Revalidation

**Demo:** `app/playground/phase-03-rendering-caching/07-cachetag-on-demand-revalidation` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/07-cachetag-on-demand-revalidation`, and click both buttons a few times.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `cacheTag('posts')` inside a `"use cache"` scope | Labels that cache entry for later, targeted invalidation | The addressing scheme — nothing happens until something invalidates the tag |
| `updateTag('posts')` | Immediately expires the tag; the next request blocks until fresh | Read-your-own-writes — the user sees their own change right away |
| `revalidateTag('posts', 'max')` | Marks the tag stale; next request serves the old value while regenerating in the background | Stale-while-revalidate — for changes where a slight delay is fine |
| `updateTag` location | **Server Actions only** | `revalidateTag` also works in Route Handlers (webhooks, external triggers) |

## Where Does This Run?

Server. `cacheTag` is called inside a `"use cache"` scope, at the same time the function runs (build time or first request). `revalidateTag`/`updateTag` are called from Server Actions or Route Handlers — the mutation side of the app — in response to something actually changing.

## What Is This?

Topic 6 covered *time*-based revalidation: a cache entry refreshes on a schedule regardless of whether anything actually changed. `cacheTag` and its two invalidation functions are the other half — *on-demand* revalidation, triggered by an actual mutation. Tag a cache entry with a string label, then call one of two functions after a write to invalidate everything sharing that label:

```tsx
// lib/data.ts
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
```

```tsx
// app/actions.ts
'use server'
import { updateTag } from 'next/cache'

export async function addProduct(data: FormData) {
  await db.products.create(/* ... */)
  updateTag('products') // every cache entry tagged 'products' is now stale
}
```

> **Check yourself:** Without looking, state the one-sentence rule for choosing between `updateTag` and `revalidateTag`.

## Why Does It Exist?

Time-based revalidation alone forces a trade-off: a short `revalidate` window keeps content fresh but re-runs the cached work constantly, even when nothing changed; a long window is efficient but risks showing stale content right after a real edit. Tag-based invalidation breaks that trade-off — you can set a *long* time-based lifetime (cheap, mostly-static) and still guarantee freshness the instant something actually changes, by having the mutation itself say "everything tagged X is now wrong."

## How It Works

### `cacheTag` — the addressing scheme

Call it inside a `"use cache"` scope, with one or more string tags (up to 128 tags per call, 256 characters each — over the limit is silently skipped with a console warning). Applying the same tag more than once is a no-op (idempotent). Tags can also come from the data itself, not just literals:

```tsx
async function getBookingsData(id: string) {
  'use cache'
  const data = await fetch(`https://api.example.com/bookings/${id}`).then((r) => r.json())
  cacheTag('bookings-data', data.id) // tag using data only known after the fetch
  return data
}
```

`cacheTag` by itself does nothing observable — it's purely a label. The two functions below are what act on it.

### `updateTag` — read-your-own-writes

`updateTag(tag)` **immediately expires** every cache entry with that tag. The very next request for that data blocks until it's regenerated — no stale content is served, on purpose. This is for the case where the person who just made the change needs to see it reflected right away: submit a form, land on a page showing the new state, not a cached version of the old one.

**Only callable from a Server Action.** Calling it from a Route Handler throws.

### `revalidateTag` — stale-while-revalidate

`revalidateTag(tag, profile)` marks the tag stale rather than expiring it outright. The *next* request for that data is served the current (soon-to-be-stale) value immediately, while a fresh copy regenerates in the background — the same stale-while-revalidate mechanics as Topic 6's `revalidate` timer, just triggered on demand instead of on a schedule. The second argument controls how long stale content may keep being served while the regeneration is pending:

- **`'max'` (recommended)** — effectively a full year's grace window, so requests are essentially always served *something* instantly while the real regeneration happens.
- **Another `cacheLife` profile, or `{ expire: N }`** — a narrower window if you want correctness sooner.
- **`{ expire: 0 }`** — never serve stale; the next request is a blocking cache miss. Use this only when you need the data gone immediately but can't reach for `updateTag` (e.g., you're in a Route Handler, not a Server Action).
- **Omitting the second argument entirely is deprecated** and behaves like `{ expire: 0 }` — always pass one explicitly.

Works in **both** Server Actions and Route Handlers — the natural choice for webhook-triggered invalidation (a CMS calling back into your app when content changes), where there's no user waiting on their own write to reflect immediately.

### Choosing between them

| | `updateTag` | `revalidateTag` |
|---|---|---|
| **Where** | Server Actions only | Server Actions and Route Handlers |
| **Behavior** | Immediately expires — next request blocks for fresh data | Stale-while-revalidate (with `'max'`, essentially always instant) |
| **Use case** | The user who just mutated needs to see their own change | A background refresh is acceptable — blog posts, catalogs, docs |

A single mutation can reasonably call both `revalidatePath` (Topic 11's sibling function, invalidating by path instead of tag) and `updateTag` together, since they solve different, complementary problems — a targeted tag invalidation plus a path-level refresh for good measure.

## Gotchas

- **Revalidation is triggered by the next request, not fired eagerly to every page at once.** Calling `revalidateTag('posts', 'max')` doesn't proactively re-render every route using that tag right now — pages revalidate lazily, as they're actually visited.
- **`updateTag` outside a Server Action throws.** This is a hard constraint, not a soft warning — reach for `revalidateTag` in a Route Handler instead.
- **The single-argument form of `revalidateTag(tag)` is deprecated** and quietly behaves like `{ expire: 0 }` (blocking, no stale grace period) — always pass the profile argument explicitly, and prefer `'max'` unless you specifically want a narrower window.
- **Tagging needs to happen before invalidation can find anything to invalidate.** A `cacheTag` call inside a `"use cache"` function only tags the entries that function actually produces — if the tagged function was never called (never rendered, never hit its cache-fill path), there's nothing yet for `revalidateTag`/`updateTag` to find.

## Interview Questions

**Q (High): You just added a blog post via a form submission. The user should see it in the post list immediately. Which function do you reach for, and why not the other one?**

Answer: `updateTag`, called from the Server Action handling the form submission. It immediately expires the tagged cache entries, so the very next request — the one rendering the page the user lands on after submitting — blocks until fresh data is available, guaranteeing they see their own change. `revalidateTag`, even with `'max'`, is stale-while-revalidate by design: the request right after calling it can still serve the *old* cached list while a fresh copy regenerates in the background, which is exactly wrong for a read-your-own-writes requirement.

The trap: reaching for `revalidateTag` out of habit because it's more broadly available (works in Route Handlers too) — the deciding factor should be whether immediate consistency for the actor is required, not which function is more flexible.

**Q (High): A webhook from your CMS calls a Route Handler when content changes. Which invalidation function must you use, and what does that constrain?**

Answer: `revalidateTag`, since `updateTag` can only be called from a Server Action and throws anywhere else, including Route Handlers. This constrains the freshness guarantee: the request immediately after the webhook fires may still see stale content for up to the stale-while-revalidate window you configure (recommended: pass `'max'` as the second argument), with the actual regeneration happening in the background on that triggering request.

The trap: not knowing `updateTag`'s Server-Action-only restriction exists, and reaching for it in webhook code where it will throw at runtime.

**Q (Medium): What's wrong with calling `revalidateTag('posts')` with no second argument?**

Answer: The single-argument form is deprecated and behaves like `{ expire: 0 }` — a blocking cache miss on the very next request, with zero stale-while-revalidate grace period, which defeats the main advantage of `revalidateTag` over `updateTag` (serving something instantly while regenerating). The fix is always passing an explicit profile, typically `'max'` for the recommended stale-while-revalidate behavior.

The trap: not realizing the omitted-argument form is a deprecated code path with real behavioral consequences, not just a "the default is fine" case.

**Q (Medium): Two different `"use cache"` functions both call `cacheTag('inventory')`. What happens when `updateTag('inventory')` is called once?**

Answer: Both cache entries are invalidated — a tag can be shared across as many cached functions/components as make sense, and one invalidation call clears every entry carrying that tag, regardless of which function produced it. This is the point of tag-based (versus path-based) invalidation: it targets data by what it *is*, not by which specific route happens to render it, so a single mutation can correctly refresh every place that data appears.

The trap: assuming tags are scoped to a single function, rather than being a genuinely global namespace shared across the whole application.

**Q (Low): Is applying the same tag to a cache entry twice (`cacheTag('a'); cacheTag('a')` or `cacheTag('a', 'a')`) a problem?**

Answer: No — tags are idempotent. Applying the same tag multiple times has no additional effect; there's no error and no duplicate-tracking overhead to worry about.

The trap: overthinking tag hygiene when the actual rule (idempotent, up to 128 tags, 256 chars each) is simple and forgiving.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state the one-line rule for choosing `updateTag` vs. `revalidateTag`
- [ ] Can explain why `updateTag` only works in Server Actions
- [ ] Can explain what `revalidateTag`'s second argument actually controls
- [ ] Can explain why the single-argument `revalidateTag(tag)` form is a trap
- [ ] Can explain why revalidation is lazy (triggered per-visit) rather than eager

---
*Next: `generateStaticParams` — now that you know how to cache and invalidate a function's output, the next question is how a whole dynamic route gets prerendered in the first place.*
