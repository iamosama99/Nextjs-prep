export default function WaitUntilDemoPage() {
  return (
    <div>
      <h1>waitUntil() Background Work</h1>
      <p>
        Visiting this page triggers proxy to fire a 1-second background POST via <code>event.waitUntil()</code>{' '}
        — but this page itself responds immediately, not after that second. Time a request to this page
        (it should be fast), then poll <code>.../api/hits</code> — the count won&apos;t have moved yet, then
        will a moment later.
      </p>
    </div>
  );
}
