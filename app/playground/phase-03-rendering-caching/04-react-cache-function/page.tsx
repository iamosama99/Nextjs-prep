import { Suspense } from 'react';
import { cache } from 'react';
import { io } from 'next/cache';

let dbCallCount = 0;

// Wrapped in React's cache(): two calls with the same id, in the same render,
// share one execution instead of running the "query" twice.
const getUser = cache(async (id: string) => {
  await io(); // force this to run per-request (see Topic 1) instead of being
  // baked into the build's static shell, so the counter is meaningful.
  dbCallCount += 1;
  return { id, name: 'Ada Lovelace', dbCallCount };
});

export default function ReactCacheFunctionPage() {
  return (
    <div>
      <h1>React&apos;s cache() — per-request memoization</h1>
      <p>
        Both boxes below call the same <code>React.cache</code>-wrapped &quot;database query&quot; for the same
        user id. Refresh the page a few times: both boxes always show the <strong>same</strong> call count,
        and it only goes up by <strong>one</strong> per refresh — even though two separate components each
        call the function.
      </p>

      <Suspense fallback={<p>Loading...</p>}>
        <ProfilePair />
      </Suspense>
    </div>
  );
}

async function ProfilePair() {
  return (
    <>
      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>ProfileHeader</h2>
        <ProfileHeader />
      </section>
      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>ProfileSidebar</h2>
        <ProfileSidebar />
      </section>
    </>
  );
}

async function ProfileHeader() {
  const user = await getUser('u1');
  return (
    <p>
      Header sees: {user.name}, dbCallCount = <strong>{user.dbCallCount}</strong>
    </p>
  );
}

async function ProfileSidebar() {
  const user = await getUser('u1'); // same id — reuses ProfileHeader's call this render
  return (
    <p>
      Sidebar sees: {user.name}, dbCallCount = <strong>{user.dbCallCount}</strong>
    </p>
  );
}
