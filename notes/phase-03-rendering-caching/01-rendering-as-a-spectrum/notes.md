# Static and Dynamic as a Spectrum

**Demo:** `app/playground/phase-03-rendering-caching/01-rendering-as-a-spectrum` — run `npm run dev`, visit `/playground/phase-03-rendering-caching/01-rendering-as-a-spectrum`, and refresh a few times.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| A component with only sync work (JSX, `fs.readFileSync`, module imports) | Completes during prerender automatically | It's part of the **static shell** with zero configuration |
| `<Suspense>` around a component that reads `cookies()`, `headers()`, `searchParams`, or does an uncached `fetch` | A hole in the static shell, filled at request time | This is where "dynamic" lives now — not a route-level flag |
| `"use cache"` on a function or component | Its output is computed once, then reused; joins the static shell if its lifetime allows | Caching is now a per-function decision, not a per-route one |
| `next build` output showing `○` vs `◐` next to a route | Fully static vs **Partially Prerendered** (static shell + streamed holes) | `◐` is normal and expected for most real routes now |

## Where Does This Run?

Two phases, and this topic is about the boundary between them. **Prerendering** happens at build time (or in the background during revalidation) on the server — it produces HTML and an RSC payload that can sit on a CDN with zero server involvement. Anything that can't complete during prerendering — because it depends on the incoming request — runs at **request time**, still on the server (Cache Components requires the Node.js runtime; the deprecated `edge` runtime isn't supported). The same route, the same response, can contain output from both phases: static parts served instantly from the shell, dynamic parts streamed in moments later. This split happens **per component**, not per route.

## What Is This?

You already know from `React-prep` that Server Components render on the server and that Suspense lets a tree stream in pieces as async work resolves. What's new here is Next.js's answer to a question React itself doesn't answer: *when* does a component's output get computed — once, at build time, and reused for everyone, or fresh, for every single request?

Most frameworks force you to answer that question once, for an entire page. Next.js's **Cache Components** model (the feature this whole phase is about, enabled via `cacheComponents: true` in `next.config.ts` — already on in this repo) lets you answer it **per component**. A single route can have a static nav bar, a product description cached for an hour, and a "5 people are viewing this" counter that's different on every request — and none of those three decisions affects the other two.

> **Check yourself:** Without looking, explain in one sentence why "static vs. dynamic" being a *component-level* decision instead of a *route-level* one changes what you can build without a client-side fetch.

## Why Does It Exist?

**Pages Router**, for context (you'll cover it properly in Phase 15): a page was either `getStaticProps` (built once, optionally revalidated as a whole) or `getServerSideProps` (rendered fresh, as a whole, every request). Binary, per page.

**App Router before Next.js 16** loosened this with route segment configs (`export const dynamic = 'force-static' | 'force-dynamic' | 'auto'`) plus an experimental Partial Prerendering flag. Still, the *default* mental model was route-level: reading `cookies()` or an uncached `fetch()` anywhere in a route silently opted the **entire route** into dynamic rendering, page and all its layouts. A single personalized "Hi, {name}" greeting in a layout used by an otherwise-static marketing site made the whole site dynamic. The only workaround was pulling that piece out into a client-side fetch after the page loaded — trading a server round-trip for a client one, and losing the SEO/first-paint benefits of server rendering for that content.

Cache Components exists to close that gap. The docs frame it as a genuine trade-off, not a free lunch: pushing the static/dynamic boundary down to the component level means the infrastructure has to support streaming a single HTTP response that's part-cached-HTML, part-live — which is more complex to host than "static files on a CDN, dynamic routes on a server." Next.js absorbs that complexity so you don't have to think about it route-by-route.

## How It Works

### Prerendering: what completes at build time

At build time, Next.js renders your route's component tree and buckets every component's work into one of four categories:

1. **Predictable values** — module imports, `fs.readFileSync`, pure computation. These always produce the same output, so they run and their result becomes part of the static HTML automatically. No opt-in needed.
2. **`"use cache"`** — the function or component's result is computed once and cached. As long as its lifetime isn't too short (see Phase 3 Topic 6 on `cacheLife`), the cached output joins the static shell just like a predictable value.
3. **`<Suspense>` boundaries** — anything wrapped in Suspense that suspends during prerender (an uncached fetch, a runtime API read, an explicit `io()`/`connection()` call) contributes its **fallback** to the shell. The real content streams in at request time.
4. **Random values / timestamps without `io()`** — `Math.random()`, `Date.now()`, `crypto.randomUUID()` called directly, with no cache and no Suspense. This is a build error: Next.js refuses to silently bake a build-time random value into every future response, or silently make the whole route dynamic. You have to say which one you mean (Phase 3 Topic 2 covers this in depth).

The result of this pass is a **static shell**: a fully-formed page for direct visits and an RSC payload for client navigations, with fallback UI sitting in every hole that couldn't complete. This is **Partial Prerendering (PPR)** — as of Cache Components, it's not an opt-in flag anymore, it's just what prerendering does.

```tsx
// app/playground/phase-03-rendering-caching/01-rendering-as-a-spectrum/page.tsx
export default function Page() {
  return (
    <>
      <h1>Static header — baked at build time</h1>       {/* category 1 */}
      <Suspense fallback={<p>Loading live data...</p>}>   {/* category 3 */}
        <LiveRequestId />
      </Suspense>
    </>
  )
}
```

When you `next build` this repo, you'll see `○` next to fully-static routes and `◐` next to routes like this one — Partial Prerender, meaning "static shell + at least one streamed hole." Both are correct outcomes; `◐` is not a failure state.

### The static shell vs. the App Shell — same idea, two names for a reason

"Static shell" is the general term: build-time content plus fallbacks. **App Shell** is the specific case where the route also has *unknown URL data* — a dynamic segment like `/shop/[slug]` where `slug` wasn't listed in `generateStaticParams` (Phase 3 Topic 8). Since Next.js can't prerender content it doesn't have a concrete value for, it prerenders the **reusable, URL-independent version** — the same shell, with the slug-dependent parts behind their own fallback — and serves that instantly to the first visitor of an unknown slug, then upgrades it in the background (this is ISR under Cache Components — Phase 3 Topic 9). The App Shell is also what a `<Link>` prefetches by default under Partial Prefetching, and it's what a route falls back to during a client navigation.

### Maximizing the static shell: push `await` down, don't hoist it up

The single highest-leverage habit this model rewards: the *deeper* an async read sits in your component tree, the more of the page prerenders. This looks small but changes how you structure layouts.

```tsx
// Before — the whole layout blocks on params
export default async function Layout({ children, params }: LayoutProps<'/shop/[slug]'>) {
  const { slug } = await params            // layout can't prerender past this line
  return (
    <div>
      <Sidebar />
      <h1>{slug}</h1>
      {children}
    </div>
  )
}
```

```tsx
// After — only the piece that needs the param is dynamic
export default function Layout({ children, params }: LayoutProps<'/shop/[slug]'>) {
  return (
    <div>
      <Sidebar />                          {/* stays in the static shell */}
      <Suspense fallback={<h1>Loading...</h1>}>
        {params.then(({ slug }) => <SlugHeading slug={slug} />)}
      </Suspense>
      {children}                           {/* stays in the static shell */}
    </div>
  )
}
```

`Sidebar` and `children` no longer depend on whether `params` resolved — they're static regardless. This exact pattern is why several Phase 2 playground routes (`05-dynamic-segments`, `06-catch-all-segments`, `08-intercepting-routes`, `11-not-found`) were restructured when `cacheComponents` was turned on for this repo: each one awaited `params` at the top of the page, which is precisely the "before" shape above.

> **Check yourself:** A layout awaits `cookies()` at its top level, above a `{children}` slot. Is `{children}` still eligible for the static shell? Why or why not — and what's the one-line fix?

### Bots and crawlers don't get the shell

Browsers get the static shell instantly and the dynamic holes stream in after. Bots and crawlers are detected by user agent and handled differently on purpose: since they need one complete document (no incremental JS-driven rendering), Next.js skips the shell entirely and renders the whole page dynamically at request time before responding. The practical trap: any data your shell relied on that only exists *during prerendering* (a build-time-only data source, a value not reachable at request time) will work for a human visitor and silently fail for a crawler, because the crawler's render re-executes that code path at request time instead of reusing the shell.

## The Old vs New Approach

| | Pages Router | App Router pre-16 | Cache Components (Next.js 16+) |
|---|---|---|---|
| Granularity | Whole page | Whole route (all segments) | Individual component/function |
| How you opt into dynamic | `getServerSideProps` | Reading `cookies()`/`headers()`/uncached `fetch` anywhere in the route | Same reads, but only the component doing the read goes dynamic — if it's wrapped in `<Suspense>` |
| Mixing static + personalized content | Not possible server-side; client-fetch after load | Not possible without full-route opt-out; client-fetch after load | Native — cache what you can, stream the rest, same response |

## Gotchas

- **`<Suspense>` doesn't itself make something dynamic.** If everything inside the boundary is synchronous work, it completes during prerendering and ships as static content in the fallback's place — Suspense is a streaming mechanism, not a dynamic-opt-in mechanism. The opt-in comes from *what's inside* (an uncached read, a runtime API, an unguarded random value).
- **A route can look static and still print `◐`.** One Suspense boundary anywhere in the tree, however small, is enough to mark the whole route Partial Prerender in the build output. That's expected, not a regression.
- **Crawlers re-run request-time code paths that browsers never touch.** A shell that depends on build-time-only state can pass every manual check (you, in a browser) and still break for search engine indexing.
- **This is a hard requirement, not a lint warning.** Cache Components validates during `next build` and `next dev` — an unguarded random value or uncached read outside Suspense is a build error, not a runtime surprise you discover in production. That's a deliberate design choice: better to fail the build than silently serve inconsistent content.

## Interview Questions

**Q (High): What problem does Cache Components solve that route-level `dynamic = 'force-dynamic'` didn't?**

Answer: Route-level dynamic rendering is all-or-nothing per route — one personalized element (cookie-based greeting, live price) anywhere in a route's component tree forces the entire route, including every layout above it, into per-request rendering. Cache Components moves the static/dynamic decision to the component level, so a page can have a static shell, independently-cached data, and a genuinely per-request slice coexisting in one streamed response, without a route-wide opt-out or a client-side fetch to patch around it.

The trap: candidates who only know pre-16 Next.js will describe `force-dynamic`/`force-static` as the current model. Reference the difference explicitly, and be ready to name what replaced each (Phase 3 Topic 11 covers the full migration mapping).

**Q (High): What determines whether a component ends up in the static shell versus streamed at request time?**

Answer: Four buckets, decided during prerendering: (1) purely synchronous/predictable work always completes and ships in the shell; (2) `"use cache"` output joins the shell if its `cacheLife` lifetime isn't too short; (3) anything under `<Suspense>` that suspends — an uncached fetch, a runtime API (`cookies`/`headers`/`searchParams`), or an explicit `io()`/`connection()` call — contributes its fallback to the shell and streams its real content at request time; (4) unguarded random/timestamp values with no cache and no Suspense fail the build outright, because Next.js won't guess whether you meant "same for everyone" or "fresh per request."

The trap: candidates often say "it's dynamic if it reads `cookies()`" without mentioning the Suspense requirement — under Cache Components, an unwrapped runtime-API read is a *build error*, not silent full-route dynamic rendering like it was pre-16.

**Q (High): What's the difference between the "static shell" and the "App Shell"?**

Answer: Static shell is the general artifact of prerendering — build-time content plus Suspense fallbacks for anything that couldn't complete. App Shell is the specific case for routes with dynamic URL segments whose params weren't listed in `generateStaticParams`: it's the same shell concept, but built without knowing the concrete param value, so the URL-dependent parts sit behind their own fallback too. The App Shell is what gets served instantly on a first visit to an unlisted param and what a `<Link>` prefetches by default.

The trap: treating them as unrelated terms instead of recognizing the App Shell is a static shell with an extra axis of unknown-ness (the URL itself).

**Q (Medium): Why does pushing an `await` deeper into the component tree "maximize the static shell," and what's a concrete example?**

Answer: Every component above the point where an async/runtime read happens can only join the static shell if it doesn't depend on that read's result. A layout that destructures `params` at its top level makes everything in that layout — sidebar, other children — wait on `params`, even if only one heading actually needs the slug. Passing the `params` promise down and awaiting it inside a `<Suspense>`-wrapped leaf component lets everything else in the layout prerender normally; only that one leaf streams.

The trap: candidates who understand Suspense from React alone sometimes miss that *where* you place the `await`, not just whether you use Suspense, determines how much of the tree stays static.

**Q (Medium): Why are bots and crawlers rendered differently from browsers under Cache Components, and what bug can this cause?**

Answer: Crawlers need one complete document per request (no client-side hydration to fill in streamed holes), so Next.js detects them by user agent and renders the entire page dynamically at request time instead of serving the shell-plus-stream response. The bug: any part of the shell that depended on data only available during prerendering (not reachable in the request-time code path) renders fine for a human, because they got the prerendered shell, but breaks for a crawler, whose render re-executes that same code path at request time and can't reach the data.

The trap: this only shows up in crawler-specific testing (e.g., "fetch as Googlebot" tools), not in normal browser QA, so it's easy to ship unnoticed.

**Q (Low): What's the practical difference between "functional fidelity" and "performance fidelity" for a hosting platform running Next.js?**

Answer: Functional fidelity is binary — every Next.js feature (streaming, PPR, on-demand revalidation, etc.) works correctly, verified by Next.js's adapter test suite. Performance fidelity is a spectrum — how close the platform gets to optimal characteristics, e.g., serving the static shell from CDN edge latency versus origin latency. A platform can have full functional fidelity (everything works) while having weaker performance fidelity (things work but aren't as fast as they could be).

The trap: assuming "supported platform" means "identically fast platform" — it means "correct," not "equally optimized."

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain in one sentence why Cache Components moves the static/dynamic decision from the route to the component
- [ ] Can name the four categories a component's work falls into during prerendering
- [ ] Can explain the difference between "static shell" and "App Shell" without notes
- [ ] Can write a minimal example of pushing an `await` down into a `<Suspense>`-wrapped child to keep a parent static
- [ ] Can explain why Suspense alone doesn't make a component dynamic
- [ ] Can explain why bots/crawlers can break even when the same route works fine for a browser

---
*Next: `<Suspense>` as the dynamic boundary — the mechanics of runtime APIs (`cookies()`, `headers()`, `searchParams`) and streaming uncached data, which is the other half of the spectrum this topic introduced.*
