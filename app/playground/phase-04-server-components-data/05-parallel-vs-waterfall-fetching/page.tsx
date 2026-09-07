import { Suspense } from 'react';
import { io } from 'next/cache';
import { getArtist, getAlbums } from './data';

export default function ParallelVsWaterfallPage() {
  return (
    <div>
      <h1>Parallel data fetching vs sequential waterfalls</h1>
      <p>
        Both sections fetch the same two things — an artist and their albums, each simulated with a 200ms
        delay. One awaits them one after another; the other starts both before awaiting either.
      </p>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>Waterfall (sequential awaits)</h2>
        <Suspense fallback={<p>Loading...</p>}>
          <WaterfallSection />
        </Suspense>
      </section>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Parallel (Promise.all)</h2>
        <Suspense fallback={<p>Loading...</p>}>
          <ParallelSection />
        </Suspense>
      </section>
    </div>
  );
}

async function WaterfallSection() {
  await io(); // Date.now() is a non-deterministic value (Phase 3, Topic 1) — needs io() first
  const start = Date.now();
  const artist = await getArtist(); // waits here
  const albums = await getAlbums(); // then starts, only after the above resolves
  const elapsed = Date.now() - start;

  return (
    <p>
      {artist.name} — {albums.join(', ')}
      <br />
      Elapsed: <strong>{elapsed}ms</strong> (expect ~400ms — two 200ms calls, back to back)
    </p>
  );
}

async function ParallelSection() {
  await io();
  const start = Date.now();
  const artistPromise = getArtist(); // fires now
  const albumsPromise = getAlbums(); // also fires now, doesn't wait for artistPromise
  const [artist, albums] = await Promise.all([artistPromise, albumsPromise]);
  const elapsed = Date.now() - start;

  return (
    <p>
      {artist.name} — {albums.join(', ')}
      <br />
      Elapsed: <strong>{elapsed}ms</strong> (expect ~200ms — both 200ms calls ran concurrently)
    </p>
  );
}
