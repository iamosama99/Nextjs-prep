export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard (protected)</h1>
      <p>
        You only got here because proxy&apos;s optimistic check found a <code>demo_proxy_session</code>{' '}
        cookie. Nothing here re-verifies that against a database — that&apos;s the point this topic&apos;s
        notes make about optimistic vs. secure checks.
      </p>
      <a href="/playground/phase-07-proxy-edge/03-auth-checks-in-proxy/api/logout">Log out</a>
    </div>
  );
}
