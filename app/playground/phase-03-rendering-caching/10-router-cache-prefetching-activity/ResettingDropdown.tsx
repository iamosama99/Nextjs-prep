'use client';

import { useState, useLayoutEffect } from 'react';

// The documented pattern for transient UI that should NOT survive Activity's
// hide-not-unmount behavior: close it in a useLayoutEffect cleanup, which
// runs synchronously right before the route is hidden.
export default function ResettingDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, []);

  return (
    <div style={{ border: '1px solid #e00', padding: 12, marginTop: 12 }}>
      <button onClick={() => setIsOpen((o) => !o)}>
        {isOpen ? 'Close' : 'Open'} menu (resets on navigate-away)
      </button>
      {isOpen && (
        <ul>
          <li>Option 1</li>
          <li>Option 2</li>
        </ul>
      )}
    </div>
  );
}
