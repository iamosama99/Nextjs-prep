import Link from 'next/link';

export default function RouterCachePrefetchingActivityIndexPage() {
  return (
    <div>
      <h1>Router Cache, prefetching & &lt;Activity&gt;</h1>
      <p>
        This one needs a real browser — click through it rather than reading curl output.
      </p>
      <ol>
        <li>
          Open <Link href="/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity/page-a">Page A</Link>.
        </li>
        <li>Click the counter&apos;s +1 button a few times, and open the dropdown.</li>
        <li>
          Navigate to{' '}
          <Link href="/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity/page-b">Page B</Link>
          , then back to Page A.
        </li>
        <li>
          The counter still shows your count — <code>&lt;Activity&gt;</code> preserved it instead of
          resetting it. The dropdown, though, is closed again — its <code>useLayoutEffect</code> cleanup
          reset it when the route was hidden.
        </li>
      </ol>
    </div>
  );
}
