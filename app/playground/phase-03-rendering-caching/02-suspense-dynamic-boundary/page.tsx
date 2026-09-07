import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';

export default function SuspenseDynamicBoundaryPage() {
  return (
    <div>
      <h1>&lt;Suspense&gt; as the dynamic boundary</h1>
      <p>
        Both boxes below read a Request-time API (<code>headers()</code> and <code>cookies()</code>) and are
        each wrapped in their own <code>&lt;Suspense&gt;</code>. Removing either boundary would fail{' '}
        <code>npm run build</code> — try it (and revert) if you want to see the exact error.
      </p>

      <p>
        <a href="/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary/set-theme?value=dark">
          Set theme=dark
        </a>{' '}
        |{' '}
        <a href="/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary/set-theme?value=light">
          Set theme=light
        </a>
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>headers() — request headers</h2>
        <Suspense fallback={<p>Loading headers...</p>}>
          <HeaderInfo />
        </Suspense>
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>cookies() — the &quot;theme&quot; cookie</h2>
        <Suspense fallback={<p>Loading cookie...</p>}>
          <ThemeInfo />
        </Suspense>
      </section>
    </div>
  );
}

async function HeaderInfo() {
  const h = await headers();
  const userAgent = h.get('user-agent') ?? '(none)';
  return (
    <p>
      <code>user-agent</code>: {userAgent.slice(0, 60)}
      {userAgent.length > 60 ? '...' : ''}
    </p>
  );
}

async function ThemeInfo() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value ?? 'light (default — cookie not set)';
  return <p>Current theme cookie: <strong>{theme}</strong></p>;
}
