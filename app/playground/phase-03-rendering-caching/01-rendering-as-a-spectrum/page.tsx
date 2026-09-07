import { Suspense } from 'react';
import { io } from 'next/cache';

// A "predictable value" (category 1 from the notes): computed once, at build
// time, and reused for every request — no cache directive, no Suspense needed.
const buildTimestamp = new Date().toISOString();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RenderingSpectrumPage() {
  return (
    <div>
      <h1>Static and dynamic as a spectrum</h1>
      <p>
        Refresh this page a few times. The header and build timestamp below never change between
        requests — they were baked into the static shell at build time. The boxed section further
        down streams in a moment later with a fresh value every single time, because it&apos;s
        wrapped in <code>&lt;Suspense&gt;</code> and reads a per-request value behind{' '}
        <code>io()</code>.
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Static shell content</h2>
        <p>
          Built at (this literally never changes across requests, only across builds):{' '}
          <strong>{buildTimestamp}</strong>
        </p>
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>Streamed dynamic content</h2>
        <Suspense fallback={<p>Loading request-specific data...</p>}>
          <LiveRequestId />
        </Suspense>
      </section>
    </div>
  );
}

async function LiveRequestId() {
  // io() tells Cache Components "a per-request value follows" — during prerendering
  // this suspends (so the fallback above ships in the static shell instead), and at
  // real request time it resolves immediately. See the notes for io() vs connection().
  await io();
  await delay(400); // artificial delay so the stream-in is visible, not instant
  const requestId = crypto.randomUUID();

  return (
    <p>
      Request ID, generated fresh on this request: <strong>{requestId}</strong>
      <br />
      Refresh the page — this value changes every time; the section above never does.
    </p>
  );
}
