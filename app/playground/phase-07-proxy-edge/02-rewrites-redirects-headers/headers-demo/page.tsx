import { Suspense } from 'react';
import { headers } from 'next/headers';

export default function HeadersDemoPage() {
  return (
    <div>
      <h1>Headers from Proxy</h1>
      <p>
        Proxy set a REQUEST header before this page rendered, and a RESPONSE header on the way back to the
        browser. The upstream one below proves the request header actually reached this Server Component —
        <code>curl -i</code> this page to see the response header too.
      </p>
      <Suspense fallback={<p>Loading...</p>}>
        <UpstreamHeaderValue />
      </Suspense>
    </div>
  );
}

async function UpstreamHeaderValue() {
  const headersList = await headers();
  const value = headersList.get('x-hello-from-proxy-upstream');
  return (
    <p>
      Upstream request header seen by this Server Component: <strong>{value ?? '(missing)'}</strong>
    </p>
  );
}
