'use client';

import { useState } from 'react';
import { incrementFileLevelCounter } from './actions';

// This file can only ever *import* a Server Function, never define one — try
// adding 'use server' to a function right here and run `npm run build` to see
// the compiler reject it.
export default function FileLevelButton() {
  const [count, setCount] = useState<number | null>(null);

  return (
    <div>
      <button
        onClick={async () => {
          const next = await incrementFileLevelCounter();
          setCount(next);
        }}
      >
        Increment (file-level action, event handler)
      </button>
      {count !== null && <p>Client-side count after last click: {count}</p>}
    </div>
  );
}
