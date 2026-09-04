import Link from 'next/link';

export default function NextConfigDemo() {
  return (
    <div>
      <h1>next.config.ts — redirects &amp; rewrites</h1>
      <p>Both rules below are defined in the real <code>next.config.ts</code> at the project root — open it alongside this page.</p>

      <section style={{ marginTop: 16 }}>
        <h2>Redirect</h2>
        <p>
          Click this link and watch your browser&apos;s URL bar. It starts at <code>/old-page</code> and actually
          changes to <code>/new-page</code> — a real client-side redirect (307, since <code>permanent: false</code>).
        </p>
        <Link href="/playground/phase-01-fundamentals/04-next-config-essentials/old-page">
          Visit /old-page (watch the URL bar change)
        </Link>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Rewrite</h2>
        <p>
          Click this link and watch the URL bar again. It stays on <code>/proxy-demo</code> the entire time, even
          though the content you see is actually served from a completely different page internally.
        </p>
        <Link href="/playground/phase-01-fundamentals/04-next-config-essentials/proxy-demo">
          Visit /proxy-demo (URL bar does NOT change)
        </Link>
      </section>
    </div>
  );
}
