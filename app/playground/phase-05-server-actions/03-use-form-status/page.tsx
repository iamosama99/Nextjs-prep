import { Suspense } from 'react';
import { io } from 'next/cache';
import { readSaved } from './store';
import CorrectForm from './CorrectForm';
import WrongForm from './WrongForm';

export default function UseFormStatusPage() {
  return (
    <div>
      <h1>useFormStatus &amp; Pending States</h1>
      <p>
        Both forms below submit to the same artificially-slow (1.5s) Server Action. Click each submit
        button and watch closely: only one of them actually shows a pending state.
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Correct: useFormStatus in a child of the form</h2>
        <CorrectForm />
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>Wrong: useFormStatus in the same component that owns the form</h2>
        <WrongForm />
      </section>

      <Suspense fallback={<p>Loading last saved value...</p>}>
        <LastSaved />
      </Suspense>
    </div>
  );
}

async function LastSaved() {
  await io();
  return (
    <p style={{ marginTop: 16 }}>
      Last saved value: <strong>{readSaved()}</strong>
    </p>
  );
}
