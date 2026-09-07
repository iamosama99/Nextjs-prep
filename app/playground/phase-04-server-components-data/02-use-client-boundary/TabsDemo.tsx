'use client';

import Tabs from './Tabs';

// Correct usage: TabsDemo is ITSELF a Client Component, so its reference to
// Tabs is the real function object — Tabs.Item resolves fine here.
export default function TabsDemo() {
  return (
    <Tabs>
      <Tabs.Item>Content for tab 1</Tabs.Item>
      <Tabs.Item>Content for tab 2</Tabs.Item>
    </Tabs>
  );
}
