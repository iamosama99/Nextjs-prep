import { Suspense } from 'react';
import { io } from 'next/cache';
import { listAccounts } from './store';
import SignupForm from './SignupForm';

export default function UseActionStatePage() {
  return (
    <div>
      <h1>useActionState — Form State &amp; Validation Errors</h1>
      <p>
        The fields below are pre-filled with invalid values on purpose — submit as-is to see
        server-returned validation errors render without a page reload, then fix the values and submit
        again to see the success message.
      </p>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16, maxWidth: 360 }}>
        <SignupForm />
      </section>

      <Suspense fallback={<p>Loading accounts...</p>}>
        <AccountList />
      </Suspense>
    </div>
  );
}

async function AccountList() {
  await io();
  const accounts = listAccounts();
  return (
    <div style={{ marginTop: 16 }}>
      <h2>Created accounts (server-side list)</h2>
      {accounts.length === 0 ? <p>None yet.</p> : <ul>{accounts.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}
