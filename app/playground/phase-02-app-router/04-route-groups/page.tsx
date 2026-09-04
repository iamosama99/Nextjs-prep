import Link from 'next/link';

export default function RouteGroupsIndex() {
  return (
    <div>
      <h1>Route groups</h1>
      <p>
        Two folders, <code>(alpha)</code> and <code>(beta)</code>, each with their own <code>layout.tsx</code>{' '}
        (different border colors below). Neither name appears in the URL.
      </p>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link href="/playground/phase-02-app-router/04-route-groups/hello">hello (from the (alpha) group)</Link>
        <Link href="/playground/phase-02-app-router/04-route-groups/world">world (from the (beta) group)</Link>
      </nav>
    </div>
  );
}
