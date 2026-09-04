# Linking & Navigating (`next/link`, `useRouter`, `usePathname`, `useSearchParams`)

> **Live demo:** `npm run dev` → [/playground/phase-02-app-router/12-linking-and-navigating](http://localhost:3000/playground/phase-02-app-router/12-linking-and-navigating)

## Quick Reference

| API | Type | Gives you |
|---|---|---|
| `<Link href="...">` | Component | Declarative navigation, automatic prefetching, scroll restoration |
| `useRouter()` | Client hook | Imperative `push`, `replace`, `back`, `forward`, `refresh` |
| `usePathname()` | Client hook | The current path as a plain string — no query string |
| `useSearchParams()` | Client hook | A read-only, `URLSearchParams`-like view of the query string |

## Where Does This Run?

Client — all four are part of the client-side navigation system (`useRouter`, `usePathname`, and `useSearchParams` explicitly require `'use client'`; `Link` is usable from a Server Component but renders client-interactive behavior).

## What Is This?

`next/link` is the default, declarative way to navigate: an anchor-like component that Next.js enhances with client-side transitions and automatic prefetching. `useRouter`, `usePathname`, and `useSearchParams` are the imperative/read hooks for when navigation needs to happen from code (after a form submits, after an action completes) or when a component needs to know what the current URL actually is.

> **Check yourself:** If a `<Link>` will always get you client-side navigation with prefetching for free, why does `useRouter` need to exist at all?

## Why Does It Exist?

Most navigation in a real app is genuinely link-like — a nav bar, a list of products, a "view details" button — and `<Link>` is built to make that maximally fast by default: prefetching likely destinations before the user even clicks. But some navigation isn't a user clicking a visible link at all — redirecting after a successful login, after a form's Server Action completes, after a timeout — and that needs to be triggered from code, which is what `useRouter`'s imperative methods are for. `usePathname` and `useSearchParams` exist because Client Components sometimes need to *read* the current URL to drive their own rendering (highlighting the active nav item, reading a filter/sort value from the query string) without necessarily navigating anywhere.

## How It Works

**`<Link>` prefetches automatically in production.** For a link to a fully static route, Next.js prefetches the entire route in the background once the link enters the viewport, so navigating feels instant — the content is often already available client-side by the time the user clicks. For a link to a dynamic route, the behavior depends on whether that route has a `loading.tsx`: **with** one, Next.js partially prefetches — the shared, static shell up to that `loading.tsx` boundary; **without** one, prefetching for that link is **skipped entirely**, not just reduced. This is a real, easy-to-miss reason a dynamic route can feel slower to navigate to than expected — the fix is usually adding a `loading.tsx` (Topic 9), not fighting the prefetcher.

Current Next.js also changed *how* prefetch requests themselves are made, not just what triggers them: prefetching is layout-aware (a layout shared by multiple prefetched links is only downloaded once) and incremental (a navigation only fetches the parts not already sitting in the client-side cache, rather than re-requesting a whole route). The practical, visible consequence is more individual prefetch requests in the network tab with a much smaller total transferred size — that's the current design intent, not a regression to investigate.

```tsx
import Link from 'next/link';

<Link href="/dashboard/settings">Settings</Link>
```

**`useRouter`** is for navigation triggered by code rather than a click:

```tsx
'use client';
import { useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();

  async function handleSubmit() {
    await login();
    router.push('/dashboard');   // navigates, adds a history entry
    // router.replace('/dashboard'); // navigates, does NOT add a history entry
    // router.refresh();             // re-fetches current route's server data, no navigation
  }
  // ...
}
```

**`router.push` vs. `router.replace`** differ only in browser history: `push` adds a new entry (back button returns to the previous page), `replace` swaps the current entry (back button skips over it) — the same distinction as `history.pushState` vs. `history.replaceState`.

**`router.refresh()` is the one most worth understanding precisely** — it does **not** navigate anywhere. It re-fetches the current route's data from the server (invalidating what's cached for it, Phase 3) and re-renders with the fresh result, while preserving client-side state (like form input, scroll position, open UI) that isn't tied to the server data itself. This is the standard way to reflect a mutation (something changed via a Server Action or API call) in already-rendered Server Component output without a full page reload.

**`usePathname()`** returns just the path — `/dashboard/settings`, no query string — commonly used to compare against a link's `href` to highlight an active nav item.

**`useSearchParams()`** returns a read-only, `URLSearchParams`-like object for the current query string. The detail worth being precise about: because query-string values aren't knowable at build time, a component that calls `useSearchParams()` opts into being resolved client-side, up to the nearest Suspense boundary — during static rendering, Next.js needs somewhere to "suspend" while it waits for the actual client-side URL, rather than that requirement forcing the *entire* page into fully dynamic, non-static rendering. Wrapping the component using `useSearchParams()` in its own `<Suspense>` boundary keeps that cost contained to just that component instead of de-optimizing the whole route.

```tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SearchResultsInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  return <p>Results for: {query}</p>;
}

export default function SearchResults() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SearchResultsInner />
    </Suspense>
  );
}
```

> **Check yourself:** Why does wrapping a `useSearchParams()`-using component in `<Suspense>` matter for the rest of the page's ability to stay statically rendered?

## Controlling and Observing Prefetch/Navigation

Two more pieces worth knowing alongside the defaults above:

**Opting out of, or delaying, prefetch** — useful for large lists of links (an infinite-scroll table) where prefetching every visible link would waste resources:

```tsx
<Link prefetch={false} href="/blog/some-post">Post</Link>
```

A middle ground is prefetching only on hover instead of on-viewport, so you're not paying for links the user's eyes merely passed over:

```tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';

function HoverPrefetchLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <Link href={href} prefetch={active ? null : false} onMouseEnter={() => setActive(true)}>
      {children}
    </Link>
  );
}
```

**Observing a pending navigation** — `useLinkStatus` reports whether the `<Link>` it's nested inside is currently navigating, useful on slow networks where a prefetch hasn't finished by the time the user clicks and there's otherwise no visual feedback that anything happened:

```tsx
'use client';
import { useLinkStatus } from 'next/link';

function LoadingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : null;
}
```

## Gotchas

- **Assuming you need to manually implement prefetching.** `<Link>` already does it by default in production (though it's disabled in `next dev` by default for faster iteration) — reaching for a custom prefetch solution on top is usually redundant.
- **A dynamic route with no `loading.tsx` isn't "partially prefetched" — it isn't prefetched at all.** This is a distinct failure mode from static routes and easy to misdiagnose as "prefetching is broken" when the actual fix is adding a `loading.tsx` boundary.
- **Confusing `router.refresh()` with `router.push()`.** `refresh()` doesn't navigate at all — it's purely "re-fetch this route's server data in place." Using `push` to the current URL as a workaround to "refresh" data is a common but unnecessary pattern once `refresh()` is understood correctly.
- **Skipping the `<Suspense>` wrapper around `useSearchParams()`** and being surprised the entire route lost its static rendering — the fix isn't avoiding `useSearchParams()`, it's isolating its cost with a boundary.

## Interview Questions

**Q (High): What's the difference between `router.push()` and `router.refresh()`?**

Answer: `router.push()` performs an actual client-side navigation to a new URL, adding a browser history entry. `router.refresh()` does not navigate anywhere at all — it re-fetches the current route's data from the server and re-renders with the fresh result, while preserving client-side state that isn't derived from that server data. `refresh()` is the standard way to reflect a mutation in already-rendered server output without a full page reload or an unnecessary navigation.

The trap: describing `refresh()` as "like push() but to the same URL" — mechanically and semantically they're different operations, and treating them as equivalent misses `refresh()`'s actual purpose.

**Q (High): Why does using `useSearchParams()` often require wrapping the component in a Suspense boundary?**

Answer: Query-string values aren't known at build time, so a component reading them via `useSearchParams()` must be resolved on the client rather than fully at build/static-generation time. Wrapping just that component in its own `<Suspense>` boundary contains this requirement to that component alone — without it, the entire page can be forced out of static rendering just because one small part of it needs the live query string.

The trap: not knowing the Suspense requirement exists at all, or assuming `useSearchParams()` simply "doesn't work" in a statically rendered route rather than understanding the actual mechanism and the fix.

**Q (Medium): Does `next/link` prefetch by default, and does that differ between static and dynamic routes?**

Answer: Yes, in production — for static routes, the full route is prefetched once the link is visible in the viewport. For dynamic routes it depends entirely on whether `loading.tsx` exists: with one, the shared static shell up to that boundary is partially prefetched; without one, prefetching for that link is skipped entirely rather than degraded, since there's no safe static shell Next.js can prefetch ahead of the actual dynamic render.

The trap: describing dynamic-route prefetching as uniformly "partial" regardless of `loading.tsx` — the no-`loading.tsx` case is a full skip, not a smaller partial fetch, and conflating the two misses a real, actionable performance lever.

**Q (Medium): How would you avoid prefetching every link in a very long list, without giving up prefetching entirely for the app?**

Answer: Set `prefetch={false}` on those specific `<Link>` components to opt them out individually — appropriate for something like an infinite-scroll table where prefetching every visible row would waste resources on links the user will likely never click. A middle ground is prefetching only on hover, toggling the `prefetch` prop from `false` to `null` (the default, viewport-triggered behavior) once the user's cursor enters the link, so you pay the prefetch cost only for links the user shows real intent toward.

The trap: disabling prefetching app-wide via some global setting (there isn't a clean one) instead of scoping the opt-out to the specific links that actually need it.

**Q (Medium): What's the difference between `usePathname` and `useSearchParams` in terms of what they return?**

Answer: `usePathname()` returns just the path portion of the URL as a plain string (`/dashboard/settings`), with no query string. `useSearchParams()` returns a read-only, `URLSearchParams`-like object representing just the query string portion (`?sort=asc` → access via `.get('sort')`). Together they cover the full URL; neither includes the other's part.

The trap: expecting one of them to return the full URL including both parts.

**Q (Medium): When would you use `useRouter`'s imperative navigation instead of just using a `Link`?**

Answer: Whenever navigation needs to be triggered by something other than a direct user click on a visible link — after a Server Action or form submission completes, after an async operation like login succeeds, on a timer, or conditionally based on logic that only resolves at runtime inside an event handler.

The trap: reaching for `useRouter().push()` inside a component's render path for what's really just a normal clickable link, when `<Link>` would give the same result plus automatic prefetching for free.

**Q (Low): Does `router.push()` vs. `router.replace()` differ in browser history behavior?**

Answer: Yes — `push()` adds a new history entry (the back button returns to the previous page), while `replace()` overwrites the current entry (the back button skips over the page that called `replace()` entirely).

The trap: treating them as interchangeable navigation calls with no user-facing consequence.

---

## Self-Assessment

- [ ] Can state precisely what `router.refresh()` does and does not do
- [ ] Can explain why `useSearchParams()` needs a Suspense boundary, and what happens without one
- [ ] Knows `<Link>` prefetches differently for static vs. dynamic routes, and that a dynamic route with no `loading.tsx` isn't prefetched at all
- [ ] Can name at least one way to control prefetch behavior per-link (`prefetch={false}`, hover-only) and one way to observe a pending navigation (`useLinkStatus`)
- [ ] Can distinguish `usePathname` from `useSearchParams` by what part of the URL each returns
- [ ] Can give a concrete scenario where `useRouter`'s imperative navigation is the right tool over `<Link>`

---
*Next: Phase 3 — Rendering Model & Caching. Phase 2 covered how routes are structured, nested, and navigated; Phase 3 is the single highest-leverage phase for senior interviews — how Next.js actually decides what to render, when, and what it caches at each layer.*
