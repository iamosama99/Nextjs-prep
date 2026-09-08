export default function NextRequestNextResponsePage() {
  return (
    <div>
      <h1>NextRequest / NextResponse</h1>
      <p>This topic&apos;s demo is a set of endpoints under <code>./api/</code>, meant to be curled:</p>
      <ul>
        <li><code>.../api/nexturl?name=lee</code> — <code>request.nextUrl</code>&apos;s parsed pieces.</li>
        <li><code>.../api/cookies/set</code> — sets a cookie via <code>NextResponse</code>.</li>
        <li><code>.../api/cookies/read</code> — reads it back via <code>request.cookies</code>.</li>
        <li><code>.../api/redirect</code> — a real redirect via <code>NextResponse.redirect()</code>.</li>
      </ul>
    </div>
  );
}
