import { Suspense } from 'react';
import { cacheLife } from 'next/cache';

async function getShortLivedValue() {
  'use cache';
  // Deliberately short so the behavior is observable in a normal reading
  // session: stale for 5s (client), revalidates in the background after 5s
  // (server), fully expires after 20s. stale < 30s and expire < 5min both
  // exclude this from the static shell — hence the <Suspense> below.
  cacheLife({ stale: 5, revalidate: 5, expire: 20 });
  // An artificial delay so the background regeneration takes long enough to
  // observe — without it, regeneration is fast enough that the very request
  // which crosses the revalidate window can already see the fresh value.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
  };
}

export default function CacheLifePage() {
  return (
    <div>
      <h1>cacheLife — time-based revalidation</h1>
      <p>
        This value uses an inline profile: <code>stale: 5s, revalidate: 5s, expire: 20s</code>, plus an
        artificial 1.5s delay so the regeneration is slow enough to observe. Refresh immediately a couple
        of times — the value stays the same and the response is instant (still within the 5s revalidate
        window, served straight from cache). Wait about 6 seconds, then refresh again: this time the
        response takes about 1.5s and the value changes.
      </p>
      <p>
        That 1.5s wait is worth noticing: because this lifetime is short (well under 5 minutes), it&apos;s
        excluded from the static shell entirely and never becomes a prerendered artifact (that&apos;s also
        why it needs the <code>&lt;Suspense&gt;</code> boundary below). With no previously-built page to
        fall back to, the request that crosses the revalidate window has to wait for the regeneration
        itself, rather than getting the old value instantly while a copy regenerates silently behind it.
        Topic 9&apos;s ISR case is where the classic &quot;instant stale response, silent background
        refresh&quot; story applies cleanly — there, a whole previously-prerendered page can be served
        while the new one renders.
      </p>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
        <Suspense fallback={<p>Loading...</p>}>
          <ShortLivedValue />
        </Suspense>
      </section>
    </div>
  );
}

async function ShortLivedValue() {
  const { id, generatedAt } = await getShortLivedValue();
  return (
    <p>
      id: <strong>{id}</strong>
      <br />
      generated at: <strong>{generatedAt}</strong>
    </p>
  );
}
