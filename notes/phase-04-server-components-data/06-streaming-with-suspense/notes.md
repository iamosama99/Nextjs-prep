# Streaming with Suspense Boundaries

**Demo:** `app/playground/phase-04-server-components-data/06-streaming-with-suspense` — run `npm run dev`, visit `/playground/phase-04-server-components-data/06-streaming-with-suspense` in a browser and watch the two sections appear at different times. **Don't use `curl` to verify this one** — see Gotchas for why.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| Two sibling `<Suspense>` boundaries | Independent streaming points | Each resolves and streams in whenever *it's* ready, not blocked by the other |
| The **static shell** | Everything that renders before any async work resolves | Sent in the very first HTTP chunk — layouts, nav, fallbacks |
| The **component payload** | Serialized tree data React uses to hydrate | Ships embedded in HTML on first load; fetched alone (`rsc: 1`) on client navigation |
| `loading.js` | An automatic `<Suspense>` around the whole page | Simple, but full-page-skeleton-shaped — see the comparison table |

## Where Does This Run?

Server, producing a single HTTP response delivered as multiple chunks over time (chunked transfer encoding) — not multiple requests. The browser and server are both doing real work throughout: the server keeps generating, the browser starts painting from the first chunk without waiting for the rest.

## What Is This?

Phase 3 covered *why* something ends up static vs. streamed (the rendering model) and Topic 2 of this phase covered the Request-time APIs that trigger it. This topic is the streaming mechanism itself: what actually gets sent, in what order, and how to place `<Suspense>` boundaries deliberately rather than incidentally.

Two things travel together in the initial response:

- **The HTML stream** — progressive chunks of real markup. Static content and Suspense fallbacks arrive first; as each boundary resolves, its HTML streams in along with a small inline script that swaps it into place.
- **The component payload** — the serialized component tree React uses to hydrate. On first load it's embedded in the HTML stream; on a later client-side navigation, only the payload is fetched (no HTML at all).

> **Check yourself:** Without looking, explain why a client-side navigation transfers no HTML, only the component payload — what does the browser already have that a fresh document load doesn't?

## Why Does It Exist?

Without streaming, the server has to finish producing the *entire* HTML document before sending any of it — one slow query anywhere on the page delays everything, including content that had nothing to do with that query. Streaming decouples "how fast is my slowest data source" from "how fast does the user see anything," by sending the parts that don't depend on that slow source immediately and filling in the rest as it resolves.

## How It Works

### Granular boundaries stream independently

Sibling `<Suspense>` boundaries resolve in whatever order their work actually finishes, without blocking each other:

```tsx
<Suspense fallback={<p>Loading revenue...</p>}><Revenue /></Suspense>
<Suspense fallback={<p>Loading orders...</p>}><RecentOrders /></Suspense>
<Suspense fallback={<p>Loading recommendations...</p>}><Recommendations /></Suspense>
```

If `Revenue` resolves in 200ms, `RecentOrders` in 1s, and `Recommendations` in 3s, the user sees each section appear as soon as *its own* data is ready — not all three appearing together at the 3-second mark.

Nested boundaries create a **progressive reveal**: an outer boundary's fallback shows until it resolves, at which point an inner boundary (only now rendered) shows *its own* fallback until it resolves in turn.

### `loading.js` vs. explicit `<Suspense>`

| | `loading.js` | `<Suspense>` |
|---|---|---|
| Scope | Entire page | Any component |
| Setup | Drop in a file | Wrap explicitly |
| Navigation | Prefetched as instant fallback | Not prefetched by default |
| Best for | Nothing meaningful to show until data resolves | Most pages — granular control |

Prefer explicit boundaries placed close to the actual dynamic access. If the prerenderer hits dynamic work with no boundary anywhere above it, the build fails (Phase 3's validation). A `loading.js` high in the tree technically satisfies that requirement, but the entire page then falls back to one full-page skeleton instead of streaming section by section — it's a valid fix, not necessarily a *good* one.

### Push dynamic access down, not just for the static shell's sake

Phase 3's "maximize the static shell" pattern is also directly a streaming-granularity pattern: awaiting `params`, `cookies()`, or a data fetch at the top of a layout or page makes *everything below that point* dynamic, collapsing what could have been several independently-streaming sections into one big blocked chunk. Passing the promise down to the specific component that needs it — and putting the `<Suspense>` boundary there instead of higher up — is what actually produces granular, independent streaming rather than one large blocked section that happens to be technically "not the whole page."

### The HTTP contract: what streaming forecloses

Once the response starts streaming, the status code and headers are locked in — **you cannot change them after the fact.** This has concrete consequences:

- If `notFound()` fires *after* streaming has already begun (inside a Suspense boundary, say), Next.js can't retroactively send a 404 — it already committed to `200 OK` to start the stream. Instead, it injects `<meta name="robots" content="noindex">` so search engines don't index the page.
- A `redirect()` mid-stream similarly becomes a client-side redirect, not an HTTP redirect header.
- To get a *real* HTTP status for a not-found case, run the check **before** any `await` or `<Suspense>` boundary — a fast existence check ahead of the streamed section, not inside it.

```tsx
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const exists = await checkSlugExists(slug) // fast, before any Suspense
  if (!exists) notFound() // a genuine 404 — nothing has streamed yet
  return (
    <Suspense fallback={<p>Loading post...</p>}>
      <PostContent slug={slug} />
    </Suspense>
  )
}
```

### Bots get a different contract entirely

HTML-limited crawlers (detected by user agent) need complete metadata in `<head>` before anything else — Next.js makes them wait for `generateMetadata` to resolve and then renders the whole page dynamically, skipping the prerendered shell and the staggered streaming a real browser gets. This means a page relying on data that's only reachable *during prerendering* (not at real request time) can work fine for a person and silently break for a crawler, since the crawler's render re-executes that code path for real rather than reusing the shell (Phase 3, Topic 1's version of this same gotcha, now specifically in the streaming context).

## Gotchas — What Can Silently Defeat Streaming

This is the single most practically important thing in this topic: **streaming can be happening correctly on the server and still not reach the user progressively**, because something between the server and the browser buffers the whole response before delivering it.

- **`curl` buffers by default**, and even `curl -N` still relies on newline characters to flush — a stream without them can look stalled even when it isn't. **Don't verify streaming behavior with plain `curl`.**
- **Reverse proxies (nginx and similar) buffer by default.** Fix with `X-Accel-Buffering: no`.
- **CDNs may buffer entire responses** before forwarding — check your provider's streaming support and required configuration.
- **Serverless platforms don't all support streaming out of the box** — AWS Lambda requires explicitly enabling response streaming mode.
- **Compression (gzip/Brotli) can add latency to the first visible chunk**, since the algorithm needs enough data to compress efficiently before flushing.
- **Safari/WebKit buffers responses under 1024 bytes** — a genuinely tiny response paints all at once regardless of server-side streaming. Real pages easily exceed this; it mostly bites minimal demos.

The reliable way to verify: read the response as a raw stream in a small script (`fetch` + `response.body.getReader()`), with `Accept-Encoding: identity` to disable compression buffering, and log each chunk's arrival time — which is exactly what this topic's demo does, deliberately *not* using `curl`.

### Web Vitals — where boundaries help and where they hurt

- **TTFB/FCP improve**: the server sends the static shell as soon as it's ready, not after the slowest query — TTFB stops being bound to your slowest data source.
- **LCP can get *worse* if placed carelessly**: an LCP element (hero image, main heading) *inside* a Suspense boundary can't paint until that boundary resolves and its swap script runs — keep LCP elements outside/above boundaries, in the static shell, and use `next/image`'s `preload` prop for LCP images specifically.
- **CLS needs matching skeleton dimensions**: a fallback whose size doesn't match its eventual resolved content causes a layout shift on swap — size skeletons to match, or reserve space with fixed/min-height containers.
- **INP improves via selective hydration**: each `<Suspense>` boundary is also a hydration unit — React hydrates them independently and prioritizes whatever the user is actually interacting with, instead of one large blocking hydration pass for the whole page.

## Interview Questions

**Q (High): A page has an LCP hero image wrapped in a `<Suspense>` boundary that resolves after a 2-second data fetch. What's wrong with this, and what's the fix?**

Answer: Wrapping the LCP element in a Suspense boundary ties its paint time to that boundary's resolution — the image can't appear until the boundary's content streams in and its swap script runs, which directly delays LCP by however long that boundary takes. The fix is keeping LCP elements (hero images, primary headings) outside or above Suspense boundaries, in the static shell, so they paint immediately regardless of what else on the page is still streaming. For an LCP image specifically, `next/image`'s `preload` prop also gets the browser fetching it from the very first chunk, independent of streaming boundaries.

The trap: assuming "more Suspense boundaries is always better for performance" — boundaries help TTFB/INP but can actively hurt LCP if placed around content the page's Core Web Vitals score depends on.

**Q (High): You verify a page streams correctly using `curl`, and every section arrives in what looks like one burst. Does this mean streaming isn't working?**

Answer: Not necessarily — `curl` buffers output by default, and even with `-N` it relies on newline characters to flush chunks, so a genuinely streaming response can appear to arrive all at once through `curl` regardless of server behavior. The reliable check is reading the response as a raw stream (`fetch` + `getReader()`, with `Accept-Encoding: identity` to avoid compression buffering) and logging each chunk's arrival timestamp, or using the Network tab's timing breakdown (a long "Content Download" phase with an early "Time to First Byte" indicates real streaming).

The trap: treating `curl`'s output as authoritative evidence about server-side streaming behavior — it's a client with its own buffering quirks, not a neutral observer.

**Q (Medium): A component calls `notFound()` after a `<Suspense>` boundary has already started streaming. Does the response get a real HTTP 404 status?**

Answer: No — once streaming has begun, the server has already committed to sending `200 OK` as the response's status code, and that can't be changed retroactively. Instead, Next.js injects `<meta name="robots" content="noindex">` into the streamed HTML so the page isn't indexed, but the actual HTTP status stays 200. To get a genuine 404 status, the not-found check needs to happen *before* any `await` or Suspense boundary — a fast existence check ahead of the streamed section.

The trap: assuming `notFound()`/`redirect()` always produce a real HTTP-level response regardless of where they're called — their effect depends entirely on whether streaming has already started by that point.

**Q (Medium): Why might a page work correctly for a real user but fail to render for a search engine crawler, specifically in a way tied to streaming?**

Answer: HTML-limited bots are detected by user agent and handled differently — Next.js waits for `generateMetadata` and then renders the entire page dynamically for them, skipping the prerendered static shell real browsers get and re-executing that render's code path for real rather than reusing the shell. If part of the shell depended on data only reachable *during prerendering* (build-time-only values, or something not accessible in a genuine request-time environment), a person gets a working page from the reused shell while a crawler's from-scratch dynamic render hits the missing data and breaks.

The trap: treating this as a generic "SEO issue" rather than connecting it specifically to the shell/re-render distinction — the bug is structural (data reachability), not something a meta tag or sitemap fix addresses.

**Q (Low): Two sibling `<Suspense>` boundaries on the same page resolve at 500ms and 2s respectively. Does the 2s boundary delay the 500ms one from appearing?**

Answer: No — sibling boundaries are independent streaming points; each streams in as soon as its own async work resolves, regardless of what other boundaries on the page are still doing. The 500ms section appears at roughly 500ms; the 2s section appears roughly 1.5 seconds later, on its own schedule.

The trap: assuming Suspense boundaries resolve in the order they're written in JSX, or that a slow boundary blocks faster siblings — neither is true; they're genuinely independent.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the difference between the HTML stream and the component payload
- [ ] Can explain why sibling Suspense boundaries resolve independently, in whatever order their work finishes
- [ ] Can explain why `curl` is an unreliable way to verify streaming behavior
- [ ] Can explain why an LCP element inside a Suspense boundary can hurt Core Web Vitals
- [ ] Can explain why `notFound()`/`redirect()` behave differently before vs. after streaming has started

---
*Next: `server-only` / `client-only` packages — a focused look at the tooling that turns "this must never reach the browser" from a discipline into a build-time guarantee.*
