import { Suspense } from 'react';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function StreamingWithSuspensePage() {
  return (
    <div>
      <h1>Streaming with Suspense boundaries</h1>
      <p>
        This paragraph is part of the static shell — sent in the first chunk. The two sections below are
        independent Suspense boundaries with different delays (500ms and 2000ms); watch them appear at
        different times in a real browser. See the notes for why <code>curl</code> isn&apos;t a reliable way
        to verify this — a raw stream-reading script is used instead.
      </p>
      <Suspense fallback={<p>Loading fast section (500ms)...</p>}>
        <FastSection />
      </Suspense>
      <Suspense fallback={<p>Loading slow section (2000ms)...</p>}>
        <SlowSection />
      </Suspense>
    </div>
  );
}

async function FastSection() {
  await delay(500);
  return <p style={{ border: '1px solid #0070f3', padding: 12 }}>Fast section resolved after 500ms.</p>;
}

async function SlowSection() {
  await delay(2000);
  return <p style={{ border: '1px solid #e00', padding: 12 }}>Slow section resolved after 2000ms.</p>;
}
