import { Suspense } from 'react';
import { getPublicProfile } from './dal';

export default function AsyncServerComponentsPage() {
  return (
    <div>
      <h1>Fetching data directly in Server Components</h1>
      <p>
        <code>ProfileSection</code> below called <code>getPublicProfile</code> — a small Data Access Layer
        function — directly, with a plain <code>await</code>, right inside its own render. Open{' '}
        <code>dal.ts</code> to see the DTO shaping: the underlying &quot;row&quot; has a{' '}
        <code>passwordHash</code> and <code>internalNotes</code> field that never make it into the object
        this page actually received.
      </p>
      {/* getPublicProfile does uncached async work (Phase 3), so it needs a
          Suspense boundary here, same as any other uncached data access. */}
      <Suspense fallback={<p>Loading profile...</p>}>
        <ProfileSection />
      </Suspense>
    </div>
  );
}

// An async Server Component: data fetching happens right here, during this
// component's own render — no loader, no props interface to satisfy.
async function ProfileSection() {
  const profile = await getPublicProfile('u1');

  return (
    <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
      <h2>{profile.name}</h2>
      <p>{profile.bio}</p>
      <p>
        <code>{JSON.stringify(profile)}</code>
      </p>
    </section>
  );
}
