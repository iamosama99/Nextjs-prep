'use client';

import { useState, useEffect } from 'react';

export default function StateBox({ label }: { label: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log(`${label} mounted`);
  }, [label]);

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
      <p>{label}</p>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </div>
  );
}
