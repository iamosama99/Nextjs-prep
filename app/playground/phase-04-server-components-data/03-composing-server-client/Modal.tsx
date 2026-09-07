'use client';

import { useState, type ReactNode } from 'react';

// Accepts two slots: title and children. Neither is imported by this file —
// both arrive as already-rendered output from whichever Server Component
// owns them.
export function Modal({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) {
    return <button onClick={() => setOpen(true)}>Reopen modal</button>;
  }
  return (
    <div role="dialog" style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        {title}
        <button onClick={() => setOpen(false)}>Close</button>
      </header>
      {children}
    </div>
  );
}
