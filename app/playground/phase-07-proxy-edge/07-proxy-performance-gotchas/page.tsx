import Link from 'next/link';

export default function ProxyPerformanceGotchasPage() {
  return (
    <div>
      <h1>Proxy Performance &amp; Execution-Order Gotchas</h1>
      <ul>
        <li>
          <Link href="/playground/phase-07-proxy-edge/07-proxy-performance-gotchas/action-demo">
            /action-demo
          </Link>{' '}
          — a Server Action whose POST proxy genuinely sees (curl instructions in the notes).
        </li>
        <li>
          <Link href="/playground/phase-07-proxy-edge/07-proxy-performance-gotchas/fetch-cache-check">
            /fetch-cache-check
          </Link>{' '}
          — checks whether <code>fetch()</code> cache options have any effect inside proxy.
        </li>
      </ul>
    </div>
  );
}
