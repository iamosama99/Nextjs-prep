import { getApiKeyStatus } from './secrets';

// Correct usage: this page is a Server Component, so importing secrets.ts
// (protected by server-only) is fine — the import never crosses into the
// client graph.
export default function ServerOnlyClientOnlyPage() {
  const status = getApiKeyStatus();

  return (
    <div>
      <h1>server-only / client-only packages</h1>
      <p>
        This page imports <code>getApiKeyStatus</code> from <code>secrets.ts</code>, which has{' '}
        <code>import &apos;server-only&apos;</code> at the top. That&apos;s fine here — this page is a
        Server Component.
      </p>
      <p>
        Secret status: <strong>{status}</strong>
      </p>
      <p>
        Open <code>secrets.ts</code> for an exercise: try importing it from a Client Component instead, and
        run <code>npm run build</code> to see <code>server-only</code> enforce the boundary for real.
      </p>
    </div>
  );
}
