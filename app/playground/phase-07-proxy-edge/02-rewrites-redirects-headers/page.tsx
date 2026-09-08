import Link from 'next/link';

export default function RewritesRedirectsHeadersPage() {
  return (
    <div>
      <h1>Rewrites, Redirects &amp; Headers from Proxy</h1>
      <ul>
        <li>
          <Link href="/playground/phase-07-proxy-edge/02-rewrites-redirects-headers/old-page">
            /old-page
          </Link>{' '}
          — visiting this redirects; watch the URL bar change to <code>/new-page</code>. Neither{' '}
          <code>/old-page</code> nor <code>/rewrite-me</code> below has its own <code>page.tsx</code> —
          proxy intercepts before routing ever needs one to exist.
        </li>
        <li>
          <Link href="/playground/phase-07-proxy-edge/02-rewrites-redirects-headers/rewrite-me">
            /rewrite-me
          </Link>{' '}
          — visiting this rewrites; the URL bar stays put, but the content is{' '}
          <code>/actual-content</code>&apos;s.
        </li>
        <li>
          <Link href="/playground/phase-07-proxy-edge/02-rewrites-redirects-headers/headers-demo">
            /headers-demo
          </Link>{' '}
          — curl this with <code>-i</code> for the response header; the page itself shows the request
          header proxy forwarded upstream.
        </li>
      </ul>
    </div>
  );
}
