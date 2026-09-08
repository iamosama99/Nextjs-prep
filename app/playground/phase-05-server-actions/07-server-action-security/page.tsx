import { Suspense } from 'react';
import { io } from 'next/cache';
import { getCurrentUser } from './session';
import { listDocs, readRecordsWiped } from './store';
import { login, logout, wipeRecordsUnsafe, wipeRecordsSafe, deleteDocUnsafe, deleteDocSafe } from './actions';

export default function ServerActionSecurityPage() {
  return (
    <div>
      <h1>Server Action Security</h1>
      <p>
        A simulated session (a cookie, not real auth — Phase 10 covers the real thing) lets you switch
        between an admin and a non-admin user. Every dangerous action below exists in an <strong>unsafe</strong>{' '}
        version (matching this page&apos;s UI gating only) and a <strong>safe</strong> version (re-checking
        inside the action itself). Both are real, POST-reachable endpoints regardless of which one this
        page happens to render a button for.
      </p>

      <Suspense fallback={<p>Loading...</p>}>
        <SecurityDemo />
      </Suspense>
    </div>
  );
}

async function SecurityDemo() {
  await io();
  const user = await getCurrentUser();
  const docs = listDocs();
  const recordsWiped = readRecordsWiped();

  return (
    <div>
      <section style={{ border: '1px solid #999', padding: 12, marginTop: 16 }}>
        <h2>Session</h2>
        <p>
          Signed in as: <strong>{user ? `${user.name}${user.isAdmin ? ' (admin)' : ''}` : 'anonymous'}</strong>
        </p>
        <form action={login.bind(null, 'alice')} style={{ display: 'inline-block', marginRight: 8 }}>
          <button type="submit">Log in as Alice (admin)</button>
        </form>
        <form action={login.bind(null, 'bob')} style={{ display: 'inline-block', marginRight: 8 }}>
          <button type="submit">Log in as Bob (not admin)</button>
        </form>
        <form action={logout} style={{ display: 'inline-block' }}>
          <button type="submit">Log out</button>
        </form>
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>Page-level gating vs. re-checking inside the action</h2>
        <p>
          Records wiped: <strong>{String(recordsWiped)}</strong>
        </p>
        {!user?.isAdmin && (
          <p>
            You&apos;re not an admin — a real app would hide the button below from you. It&apos;s still
            here, and still a real endpoint (see the notes for the direct-POST proof).
          </p>
        )}
        <form action={wipeRecordsUnsafe} style={{ display: 'inline-block', marginRight: 8 }}>
          <button type="submit">Wipe records (unsafe — no re-check)</button>
        </form>
        <form action={wipeRecordsSafe} style={{ display: 'inline-block' }}>
          <button type="submit">Wipe records (safe — re-checks admin)</button>
        </form>
      </section>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Ownership checks (IDOR)</h2>
        <ul>
          {docs.map((doc) => (
            <li key={doc.id} style={{ marginBottom: 8 }}>
              {doc.title} (owner: {doc.ownerId})
              <form
                action={deleteDocUnsafe.bind(null, doc.id)}
                style={{ display: 'inline-block', marginLeft: 8 }}
              >
                <button type="submit">Delete (unsafe)</button>
              </form>
              <form
                action={deleteDocSafe.bind(null, doc.id)}
                style={{ display: 'inline-block', marginLeft: 8 }}
              >
                <button type="submit">Delete (safe)</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
