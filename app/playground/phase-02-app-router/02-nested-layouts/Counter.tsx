'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginBottom: 16 }}>
      <p>
        This counter lives in <code>layout.tsx</code>. Click it a few times, then navigate between
        Settings/Billing below — watch the count survive the navigation instead of resetting to 0.
      </p>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </div>
  );
}
