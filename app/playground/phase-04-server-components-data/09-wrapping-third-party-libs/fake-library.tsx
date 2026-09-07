import { useState } from 'react';

// Simulates a third-party component (like "acme-carousel" in the notes)
// that uses client-only features but ships with NO 'use client' directive
// of its own — imagine this file lives in node_modules and you can't edit
// it. Works fine when used from inside an already-'use client' file. Fails
// if a Server Component imports it directly — see the exercise in page.tsx.
export function ThirdPartyCounter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Third-party counter: {count}</button>
    </div>
  );
}
