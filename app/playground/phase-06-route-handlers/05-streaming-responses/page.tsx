export default function StreamingResponsesPage() {
  return (
    <div>
      <h1>Streaming Responses from a Route Handler</h1>
      <p>
        <code>.../api/stream</code> emits three chunks, 500ms apart, from a raw <code>ReadableStream</code>{' '}
        — no React involved. <code>curl</code> buffers the whole response before printing it, so it can
        prove the bytes eventually arrive but not that they arrived incrementally; the notes for this topic
        verify timing with a raw <code>fetch</code>/<code>getReader()</code> script instead, the same
        methodology Phase 4 Topic 6 used for Suspense-based UI streaming.
      </p>
    </div>
  );
}
