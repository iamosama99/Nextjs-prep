'use client';

import { useState, type ReactNode } from 'react';

// A compound component: Tabs.Item is a static property, not a separate
// module. This works fine when consumed from ANOTHER Client Component (see
// TabsDemo.tsx) — but breaks if a Server Component imports Tabs directly and
// tries to access Tabs.Item, because the Server Component only sees a client
// *reference* to Tabs, which has no static properties on it. Try it: change
// page.tsx to import Tabs directly and write <Tabs.Item>, then `npm run
// build` — revert afterward.
function Tabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.isArray(children) &&
          children.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ fontWeight: active === i ? 'bold' : 'normal' }}>
              Tab {i + 1}
            </button>
          ))}
      </div>
      <div style={{ marginTop: 8 }}>{Array.isArray(children) ? children[active] : children}</div>
    </div>
  );
}

function TabItem({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

Tabs.Item = TabItem;

export default Tabs;
