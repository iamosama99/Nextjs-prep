import { Suspense } from 'react';
import { io } from 'next/cache';

const buildTimestamp = new Date().toISOString();

async function getCachedId() {
  'use cache';
  // No explicit cacheLife -> implicit "default" profile (15 min revalidate).
  // Topic 6 covers cacheLife in depth and how to make this window observable.
  return crypto.randomUUID();
}

async function getLiveId() {
  await io();
  return crypto.randomUUID();
}

export default function UseCacheDirectivePage() {
  return (
    <div>
      <h1>The &quot;use cache&quot; directive</h1>
      <p>
        Three boxes, three different lifetimes. Refresh repeatedly over the next few minutes and watch how
        each one behaves differently.
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>1. Static (build-frozen)</h2>
        <p>Never changes until the next build: <strong>{buildTimestamp}</strong></p>
      </section>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
        <h2>2. &quot;use cache&quot; (shared, revalidates after ~15 min)</h2>
        <Suspense fallback={<p>Loading cached id...</p>}>
          <CachedId />
        </Suspense>
        <p>Same for everyone, but not frozen forever like box 1 — it can change on a future request.</p>
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>3. Streamed per-request (Topic 1&apos;s io() pattern)</h2>
        <Suspense fallback={<p>Loading live id...</p>}>
          <LiveId />
        </Suspense>
        <p>Different on literally every request.</p>
      </section>
    </div>
  );
}

async function CachedId() {
  const id = await getCachedId();
  return <p>Cached id: <strong>{id}</strong></p>;
}

async function LiveId() {
  const id = await getLiveId();
  return <p>Live id: <strong>{id}</strong></p>;
}
