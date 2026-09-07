'use client';

import { useState } from 'react';
import { ThirdPartyCounter } from './fake-library';

// GalleryClient is ALREADY a Client Component, so importing the unwrapped
// library directly here works fine — no separate wrapper needed. The
// wrapper is only needed when a *Server* Component wants to import it.
export default function GalleryClient() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
      <p>GalleryClient (a Client Component) using the unwrapped library directly:</p>
      <button onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Show'} counter</button>
      {open && <ThirdPartyCounter />}
    </div>
  );
}
