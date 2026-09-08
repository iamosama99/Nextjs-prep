import Link from 'next/link';

export default function MiddlewareToProxyMigrationPage() {
  return (
    <div>
      <h1>Migrating from Middleware to Proxy</h1>
      <p>
        This topic is mostly historical/mechanical (the rename, the codemod) — see the notes for the
        verified codemod run. The one live demo is <code>waitUntil()</code>, a capability that shipped
        alongside this era of change:
      </p>
      <ul>
        <li>
          <Link href="/playground/phase-07-proxy-edge/06-middleware-to-proxy-migration/waituntil-demo">
            /waituntil-demo
          </Link>
        </li>
      </ul>
    </div>
  );
}
