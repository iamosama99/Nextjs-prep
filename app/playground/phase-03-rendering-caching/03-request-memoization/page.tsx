import { Suspense } from 'react';
import { headers } from 'next/headers';

export default function RequestMemoizationPage() {
  return (
    <div>
      <h1>Request Memoization</h1>
      <p>
        Both boxes below <code>fetch()</code> the exact same URL (an internal counter endpoint that
        increments on every real hit). Refresh the page a few times: the two boxes always show the{' '}
        <strong>same</strong> number as each other, and that number only goes up by <strong>one</strong> per
        refresh — proof that two <code>fetch()</code> calls to the same URL in one render pass cost one
        network request, not two.
      </p>

      <Suspense fallback={<p>Loading...</p>}>
        <CounterPair />
      </Suspense>
    </div>
  );
}

async function getCounterUrl() {
  // Route Handlers need an absolute URL when called via fetch() from a Server
  // Component — build one from the incoming request's own host header.
  const h = await headers();
  const host = h.get('host');
  const protocol = host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}/playground/phase-03-rendering-caching/03-request-memoization/api/hit-counter`;
}

async function CounterPair() {
  const url = await getCounterUrl();
  return (
    <>
      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Component A</h2>
        <CounterDisplay url={url} label="A" />
      </section>
      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>Component B</h2>
        <CounterDisplay url={url} label="B" />
      </section>
    </>
  );
}

async function CounterDisplay({ url, label }: { url: string; label: string }) {
  const res = await fetch(url);
  const { count } = await res.json();
  return (
    <p>
      Component {label} sees hit count: <strong>{count}</strong>
    </p>
  );
}
