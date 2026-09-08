import Link from 'next/link';

export default function GeolocationAbTestingPage() {
  return (
    <div>
      <h1>Geolocation &amp; A/B Testing Patterns</h1>
      <ul>
        <li>
          <Link href="/playground/phase-07-proxy-edge/04-geolocation-ab-testing/geo">/geo</Link> — reads a
          platform geo header (curl instructions on the page).
        </li>
        <li>
          <Link href="/playground/phase-07-proxy-edge/04-geolocation-ab-testing/ab-test">/ab-test</Link>{' '}
          — first visit gets randomly bucketed and cookied; refresh to see the same variant stick.
        </li>
      </ul>
    </div>
  );
}
