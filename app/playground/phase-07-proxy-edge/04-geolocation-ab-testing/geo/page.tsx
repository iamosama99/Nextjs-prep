export default function GeoPage() {
  return (
    <div>
      <h1>Geolocation (via platform headers)</h1>
      <p>
        <code>request.geo</code> / <code>request.ip</code> were removed from <code>NextRequest</code> in
        Next.js 15 — proxy now reads the hosting platform&apos;s own header directly.{' '}
        <code>curl -i -H &quot;x-vercel-ip-country: NL&quot;</code> this page and check the{' '}
        <code>x-resolved-country</code> response header.
      </p>
    </div>
  );
}
