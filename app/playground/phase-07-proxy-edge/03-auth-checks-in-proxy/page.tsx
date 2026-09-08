import Link from 'next/link';

export default function AuthChecksInProxyPage() {
  return (
    <div>
      <h1>Auth Checks in Proxy</h1>
      <ul>
        <li>
          <Link href="/playground/phase-07-proxy-edge/03-auth-checks-in-proxy/dashboard">
            /dashboard
          </Link>{' '}
          — protected; redirects to <code>/login</code> without a session cookie.
        </li>
        <li>
          <Link href="/playground/phase-07-proxy-edge/03-auth-checks-in-proxy/login">/login</Link> —
          redirects to <code>/dashboard</code> if a session cookie is already present.
        </li>
      </ul>
    </div>
  );
}
