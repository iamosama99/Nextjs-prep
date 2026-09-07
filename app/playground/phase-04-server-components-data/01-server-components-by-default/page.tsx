import { Suspense } from 'react';
import { io } from 'next/cache';
import Link from 'next/link';
import Hello from './Hello';

export default function ServerComponentsByDefaultPage() {
  return (
    <div>
      <h1>Server Components by default</h1>
      <p>
        This page renders a Server Component and a Client Component, each logging on render. Open your
        terminal and your browser console side by side.
      </p>
      <Suspense fallback={<p>Loading...</p>}>
        <LoggingSection />
      </Suspense>
      <p style={{ marginTop: 16 }}>
        Now click through to{' '}
        <Link href="/playground/phase-04-server-components-data/01-server-components-by-default/other">
          a sibling page
        </Link>{' '}
        and back. Watch which console gets a new log each time.
      </p>
    </div>
  );
}

async function LoggingSection() {
  // Forces this to run per-request (Phase 3, Topic 1) instead of being
  // baked into the static shell once at build time — otherwise these logs
  // would only fire once, ever, defeating the point of this demo.
  await io();

  // A Server Component: this log ONLY ever appears in your terminal, never
  // in the browser console, because this component's code never ships to
  // the client at all.
  console.log('[LoggingSection] Server Component rendered');

  return <Hello />;
}
