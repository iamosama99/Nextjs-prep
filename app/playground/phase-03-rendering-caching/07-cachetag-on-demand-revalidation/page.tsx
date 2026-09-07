import { Suspense } from 'react';
import { cacheLife, cacheTag, revalidateTag, updateTag } from 'next/cache';

async function getFact() {
  'use cache';
  cacheLife('max'); // long time-based lifetime — only on-demand invalidation should move this
  cacheTag('fact');
  return crypto.randomUUID();
}

// Server Actions are covered fully in Phase 5; these two are only here as the
// mechanism that lets a button trigger server-side tag invalidation.
async function updateNow() {
  'use server';
  updateTag('fact');
}

async function revalidateStaleWhileRevalidate() {
  'use server';
  revalidateTag('fact', 'max');
}

export default function CacheTagPage() {
  return (
    <div>
      <h1>cacheTag, revalidateTag & updateTag</h1>
      <p>
        The value below is cached with <code>cacheLife(&apos;max&apos;)</code> and tagged{' '}
        <code>&apos;fact&apos;</code> — on its own it would barely ever change. Both buttons invalidate the
        same tag, but differently:
      </p>
      <ul>
        <li>
          <strong>Update now</strong> calls <code>updateTag</code> — the value changes{' '}
          <strong>immediately</strong> (read-your-own-writes).
        </li>
        <li>
          <strong>Revalidate (stale-while-revalidate)</strong> calls{' '}
          <code>revalidateTag(&apos;fact&apos;, &apos;max&apos;)</code> — click it, then click it again a
          moment later. The value may <strong>not</strong> change on the very next load (you&apos;re still
          being served the stale value while it regenerates in the background) — that&apos;s the intended
          behavior, not a bug.
        </li>
      </ul>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
        <Suspense fallback={<p>Loading...</p>}>
          <FactValue />
        </Suspense>
        <form action={updateNow} style={{ display: 'inline-block', marginRight: 8 }}>
          <button type="submit">Update now (updateTag)</button>
        </form>
        <form action={revalidateStaleWhileRevalidate} style={{ display: 'inline-block' }}>
          <button type="submit">Revalidate (stale-while-revalidate)</button>
        </form>
      </section>
    </div>
  );
}

async function FactValue() {
  const fact = await getFact();
  return <p>Cached fact id: <strong>{fact}</strong></p>;
}
