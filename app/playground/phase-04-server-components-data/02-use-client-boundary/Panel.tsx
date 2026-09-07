'use client';

import { useState } from 'react';
import Icon from './Icon';
import TabsDemo from './TabsDemo';

// The entry point into the client graph. Icon.tsx has no directive of its
// own — being imported here is enough.
export default function Panel() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
      <p>
        <Icon /> This panel is the entry point (<code>&apos;use client&apos;</code>). <code>Icon</code> has
        no directive of its own — count: <strong>{count}</strong>
      </p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <div style={{ marginTop: 12 }}>
        <TabsDemo />
      </div>
    </div>
  );
}
