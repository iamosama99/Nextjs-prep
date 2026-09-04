import ClientReader from './ClientReader';

export default function EnvVarsDemo() {
  // A Server Component genuinely runs on the server, so both variables are readable here.
  const publicValue = process.env.NEXT_PUBLIC_DEMO_MESSAGE;
  const serverValue = process.env.DEMO_SERVER_SECRET;

  return (
    <div>
      <h1>Environment variables — public vs. server-only</h1>
      <p>
        Values come from <code>.env.local</code> (copy <code>.env.example</code> to <code>.env.local</code> if
        you see &quot;undefined&quot; below and restart <code>npm run dev</code>).
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>Read in a Server Component (this page)</h2>
        <div style={{ border: '1px solid #ccc', padding: 12 }}>
          <p>
            <strong>NEXT_PUBLIC_DEMO_MESSAGE</strong>: {publicValue ?? '(undefined)'}
          </p>
          <p>
            <strong>DEMO_SERVER_SECRET</strong>: {serverValue ?? '(undefined)'}
          </p>
        </div>
        <p>Both are readable here — this code only ever runs on the server.</p>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Read in a Client Component</h2>
        <ClientReader />
        <p>
          Open your browser&apos;s dev tools and view page source / the JS bundle: you&apos;ll find the
          <code> NEXT_PUBLIC_DEMO_MESSAGE</code> string baked directly into the shipped JavaScript.
          <code> DEMO_SERVER_SECRET</code> was never included at all — it comes back <code>undefined</code>,
          not because of a runtime permission check, but because the build-time substitution simply never
          happened for an unprefixed variable.
        </p>
      </section>
    </div>
  );
}
