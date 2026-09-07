import Link from 'next/link';

export default function GenerateStaticParamsIndexPage() {
  return (
    <div>
      <h1>generateStaticParams & prerendering dynamic segments</h1>
      <p>
        This route&apos;s <code>generateStaticParams</code> lists two categories — <code>fiction</code> and{' '}
        <code>nonfiction</code> — so those are prerendered at build time. <code>mystery</code> isn&apos;t
        listed; visit it anyway.
      </p>
      <ul>
        <li>
          <Link href="/playground/phase-03-rendering-caching/08-generate-static-params/fiction">
            fiction (prerendered — known at build time)
          </Link>
        </li>
        <li>
          <Link href="/playground/phase-03-rendering-caching/08-generate-static-params/nonfiction">
            nonfiction (prerendered — known at build time)
          </Link>
        </li>
        <li>
          <Link href="/playground/phase-03-rendering-caching/08-generate-static-params/mystery">
            mystery (NOT listed — see Topic 9&apos;s ISR notes for what happens here)
          </Link>
        </li>
      </ul>
      <p>
        Compare the <code>&quot;built&quot;</code> id you see on each category page across repeated visits:
        <code>fiction</code>/<code>nonfiction</code> show the exact same id every time (computed once, at
        build). <code>mystery</code> shows a new id on its very first visit, then that same id on every
        visit after — computed once, on demand, then cached. That&apos;s the ISR-with-Cache-Components
        upgrade flow Topic 9 covers.
      </p>
    </div>
  );
}
