import { ThirdPartyCounter } from './counter-wrapper';
import GalleryClient from './GalleryClient';

// Exercise: change the import above to `from './fake-library'` (the
// unwrapped source) instead of `from './counter-wrapper'` and run
// `npm run build` — this page is a Server Component, so importing the
// client-only library directly (no boundary anywhere in the chain) fails.
// Revert the import afterward.
export default function WrappingThirdPartyLibsPage() {
  return (
    <div>
      <h1>Wrapping third-party client-only libraries</h1>
      <p>
        <code>fake-library.tsx</code> simulates a third-party component with no{' '}
        <code>&apos;use client&apos;</code> of its own. This Server Component imports it through{' '}
        <code>counter-wrapper.tsx</code> — the wrapper pattern.
      </p>
      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <p>Imported via the wrapper, directly into this Server Component:</p>
        <ThirdPartyCounter />
      </section>
      <GalleryClient />
    </div>
  );
}
