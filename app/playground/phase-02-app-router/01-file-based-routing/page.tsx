import Link from 'next/link';
import Helper from './Helper';

export default function FileBasedRoutingDemo() {
  return (
    <div>
      <h1>File-based routing fundamentals</h1>
      <p>This page exists because <code>page.tsx</code> sits in this folder. Its sibling, rendered below:</p>
      <Helper />

      <section style={{ marginTop: 16 }}>
        <h2>Try a folder that has no page.tsx</h2>
        <p>
          This link points at a URL segment that has no <code>page.tsx</code> behind it. Click it — you&apos;ll
          get a real 404, proving a folder alone (or a stray file in it) never creates a route.
        </p>
        <Link href="/playground/phase-02-app-router/01-file-based-routing/no-page-here">
          Visit /no-page-here (expect a 404)
        </Link>
      </section>
    </div>
  );
}
