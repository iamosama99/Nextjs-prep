'use client';

import { useState } from 'react';

// Deliberately just useState, no persistence layer of any kind. Under Cache
// Components, navigating away and back preserves this via <Activity> — no
// external store or lifted state needed. Try it: increment, navigate to the
// other page, navigate back.
export default function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return (
    <div style={{ border: '1px solid #0070f3', padding: 12, marginTop: 12 }}>
      <p>
        {label} counter: <strong>{count}</strong>
      </p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
