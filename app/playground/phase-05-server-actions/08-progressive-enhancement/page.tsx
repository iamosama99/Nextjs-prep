import { Suspense } from 'react';
import { io } from 'next/cache';
import { readCounts } from './store';
import ServerForm from './ServerForm';
import ClientForm from './ClientForm';
import OnClickButton from './OnClickButton';

export default function ProgressiveEnhancementPage() {
  return (
    <div>
      <h1>Progressive Enhancement</h1>
      <p>
        Three ways to trigger the same kind of Server Function, from three different places. All three
        were tested with a raw HTTP POST that executes zero JavaScript — simulating JS disabled, or not
        yet loaded. Only one of them structurally cannot work that way, no matter what (see the notes for
        the surprising result on the other two).
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>1. Server Component form</h2>
        <ServerForm />
      </section>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
        <h2>2. Client Component form (same kind of real action)</h2>
        <ClientForm />
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>3. onClick (not a form)</h2>
        <OnClickButton />
      </section>

      <Suspense fallback={<p>Loading counts...</p>}>
        <Counts />
      </Suspense>
    </div>
  );
}

async function Counts() {
  await io();
  const { serverFormCount, clientFormCount, onClickCount } = readCounts();
  return (
    <ul style={{ marginTop: 16 }}>
      <li>Server Component form count: <strong>{serverFormCount}</strong></li>
      <li>Client Component form count: <strong>{clientFormCount}</strong></li>
      <li>onClick count: <strong>{onClickCount}</strong></li>
    </ul>
  );
}
