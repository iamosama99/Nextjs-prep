# Streaming Responses from a Route Handler

**Demo:** `app/playground/phase-06-route-handlers/05-streaming-responses/api/stream` — run `npm run dev`,
then run a raw `fetch`/`getReader()` script against it (not `curl` — see Gotchas). Verified for real: three
500ms-apart chunks arrived at `+189ms`, `+687ms`, `+1191ms` — genuinely incremental, not buffered and sent
as one block at the end.

## Quick Reference

| You write / see | What it actually is | Why it matters |
|---|---|---|
| `new Response(readableStream)` | A response whose body is a `ReadableStream`, not a complete value | The client can start reading before the server has finished writing |
| `ReadableStream({ async pull(controller) {...} })` | The Web Streams API, directly — no React involved | Different mechanism entirely from Suspense-based UI streaming (Phase 3/4) |
| `controller.enqueue(chunk)` / `controller.close()` | Pushes one chunk out immediately / ends the stream | Each `enqueue` can reach the client before the next one is even computed |
| `curl`'s printed output | The final, fully-assembled body | Says nothing about *when* each piece arrived — curl buffers by default |

## Where Does This Run?

Server-side, incrementally, over the lifetime of a single request — the handler function itself stays running (via the async generator driving the stream) for as long as it keeps producing chunks, rather than running once to completion and handing back a finished value.

## What Is This?

This is a genuinely different mechanism from every other "streaming" this project has covered. Phase 3 and Phase 4's streaming is about React assembling HTML incrementally around `<Suspense>` boundaries, sent as part of an RSC-aware response a Next.js client knows how to interpret. A Route Handler's streaming response has none of that — it's the raw Web Streams API, producing a plain `Response` whose body is a `ReadableStream` instead of a complete string, buffer, or JSON value. Any client capable of reading an HTTP response body incrementally (a browser's `fetch`, `curl` with the right flags, another server) can consume it — there's no React or RSC protocol involved at all.

```ts
export async function GET() {
  const stream = iteratorToStream(makeIterator())
  return new Response(stream)
}
```

> **Check yourself:** Is a Route Handler's `ReadableStream`-based streaming the same underlying mechanism as Phase 4's Suspense-based streaming, or a genuinely different one?

## Why Does It Exist?

Some responses are naturally produced incrementally rather than all at once — an LLM's token-by-token output (the docs' own leading example), a large file being read and forwarded piece by piece, a long-running computation that can report partial progress. Buffering the entire response server-side before sending anything forces the client to wait for the slowest part even if the first part was ready instantly. Returning a `ReadableStream` lets the server start sending — and the client start receiving, and potentially start rendering — as soon as the first chunk exists, rather than after the last one does.

## How It Works

### The iterator-to-stream pattern

The canonical shape: an async generator (`async function*`) that `yield`s chunks — optionally `await`-ing between them, as this topic's demo does with a 500ms `sleep` — wrapped by a small adapter that turns any async iterator into a `ReadableStream` by implementing its `pull` callback: ask the iterator for its next value, and either `enqueue` it (if there's more) or `close` the stream (if the iterator is done). This is exactly the docs' own pattern, and it's a reusable adapter — nothing about it is specific to any one route's content.

```ts
function iteratorToStream(iterator: AsyncGenerator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
      if (done) controller.close()
      else controller.enqueue(value)
    },
  })
}
```

### Verified: chunks genuinely arrive incrementally, not buffered

[`stream/route.ts`](../../../app/playground/phase-06-route-handlers/05-streaming-responses/api/stream/route.ts) yields three chunks with a 500ms `sleep` between each. A raw `fetch` against it, read chunk-by-chunk via `response.body.getReader()`, confirms genuine incremental delivery: the three chunks arrived at `+189ms`, `+687ms`, and `+1191ms` — roughly 500ms apart, matching the server's own delays, not all bunched at the very end. This is the concrete difference between "streaming" and "the server took a while but sent everything at once": a client reading the stream sees each piece as it becomes available, not only once the whole response is complete.

### Why `curl` alone can't prove this — same lesson as Phase 4 Topic 6

`curl`'s default output buffers the entire response and prints it once fully received. Running `curl` against this topic's demo shows the right total elapsed time (~1s, matching the sum of the delays) and the right final text — but that alone can't distinguish "streamed incrementally" from "the server silently waited ~1s and sent one buffered block at the end," because *either* implementation takes the same total wall-clock time from curl's perspective. Proving genuine incremental delivery requires reading the response as a stream and timing each chunk's arrival independently — exactly what this topic's `fetch`/`getReader()` script does, and the same reason Phase 4 Topic 6 used the identical approach for Suspense-based UI streaming rather than trusting `curl`.

## Gotchas

- **`curl`'s default behavior buffers the whole response** — it can prove content and total latency, but not incremental arrival. Verifying a stream is genuinely incremental requires reading it chunk-by-chunk in code (`getReader()`, or `curl --no-buffer` piped through something that prints per-chunk with timestamps), not just eyeballing `curl`'s final printed output.
- **This is a completely different mechanism from Suspense-based streaming** (Phase 3/4) — no React, no RSC payload, no `<Suspense>` boundary involved. Describing a Route Handler's `ReadableStream` response as "using Suspense under the hood" is a real, common conflation to avoid.
- **The handler function's execution lifetime extends for as long as the stream is open** — this isn't a fire-and-forget response; the async generator driving it keeps running (and can keep consuming server resources) until it closes the stream, which matters for anything with a request timeout or a serverless execution-time limit.

## Interview Questions

**Q (High): Is a Route Handler's `ReadableStream`-based response streaming the same mechanism as the Suspense-based streaming covered in Phase 3/4, or something different?**

Answer: Genuinely different. Suspense-based streaming is React/RSC-specific — HTML (and RSC payload) chunks assembled around `<Suspense>` boundaries, understood by a Next.js-aware client. A Route Handler's `ReadableStream` response is the plain Web Streams API producing raw bytes with no React or RSC protocol involved at all — any HTTP client capable of reading a response incrementally can consume it, not just a Next.js app.

The trap: assuming all "streaming" in Next.js is the same underlying mechanism because both use the word "streaming" — they solve a similar-sounding problem with entirely different, unrelated implementations.

**Q (High): Why can't `curl`'s printed output alone prove that a Route Handler's response streamed incrementally rather than being buffered server-side and sent all at once?**

Answer: `curl` buffers the entire response by default and prints it only once fully received. Both a genuinely-streaming implementation and a buffer-everything-then-send implementation would show the same total elapsed time and the same final output to `curl`, because the server-side delay dominates either way. Proving incremental delivery requires reading the response as a stream and timing each chunk's arrival independently (`fetch` + `getReader()`), which is the only way to actually observe *when* each piece arrived, not just *that* the full content eventually arrived.

The trap: treating `curl`'s correct total timing and correct final content as sufficient proof of streaming behavior — it's necessary but not sufficient evidence.

**Q (Medium): What are the two things the `pull` callback in a `ReadableStream` needs to do when driving it from an async iterator?**

Answer: Ask the iterator for its next value (`await iterator.next()`), then either call `controller.enqueue(value)` to push that chunk to any active reader if there's more data, or call `controller.close()` if the iterator reports it's done. This is the entire adapter needed to turn any async generator into a `ReadableStream` the Response constructor can accept as a body.

The trap: forgetting the `close()` call, which leaves the stream open indefinitely once the iterator is actually exhausted — the response would never complete from the client's perspective.

**Q (Medium): Why would a route handler prefer returning a `ReadableStream` over just `await`-ing all the data and returning a complete `Response.json(...)`?**

Answer: When the response's content is naturally produced incrementally (an LLM's token-by-token output, a long file being read and forwarded, any computation that can report partial results as they become available), buffering everything before sending forces the client to wait for the slowest part even if earlier parts were ready immediately. Streaming lets the client start receiving — and potentially start using — data as soon as the first chunk exists.

The trap: reaching for streaming as a general performance optimization for any slow endpoint, rather than recognizing it specifically helps when data is genuinely producible incrementally — wrapping a single, atomic, all-or-nothing computation in a stream that only ever emits one chunk at the very end provides no benefit over just awaiting it directly.

**Q (Low): Does the handler function driving a `ReadableStream` response finish executing as soon as it returns the `Response` object?**

Answer: No — the async generator (or whatever is producing chunks via the stream's `pull` callback) keeps running for as long as the stream stays open, continuing to execute and `enqueue` chunks after the initial `return new Response(stream)` line has already run. The function's real execution lifetime tracks the stream's lifetime, not the line where `Response` was constructed.

The trap: assuming `return new Response(stream)` marks the end of the handler's meaningful work, the same way returning a value normally would for a function that computes everything up front.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why Route Handler streaming and Suspense-based UI streaming are different mechanisms, not variations of one
- [ ] Can write the two-branch logic (`enqueue` vs `close`) a `pull` callback needs to drive a stream from an async iterator
- [ ] Can explain precisely why `curl`'s output alone can't prove incremental delivery, and what would
- [ ] Can name a genuine use case where streaming helps vs. one where it provides no benefit
- [ ] Knows the handler's execution lifetime extends for as long as the stream stays open, not just until `Response` is constructed

---
*Next: CORS & webhooks in Route Handlers — this phase has treated every endpoint as same-origin so far; the next topic covers what changes when the caller is a different origin (CORS) or a third-party service with no UI at all (webhooks).*
