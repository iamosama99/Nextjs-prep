export default function ReadingRequestDataPage() {
  return (
    <div>
      <h1>Reading Search Params, Headers &amp; Cookies in Handlers</h1>
      <p>Curl these:</p>
      <ul>
        <li>
          <code>.../api/compare?q=hello</code> with{' '}
          <code>-H &quot;x-demo-header: hi&quot; -b &quot;demo=cookie-value&quot;</code> — reads the same
          data two (or three) genuinely redundant ways.
        </li>
        <li>
          <code>.../api/set-via-next-headers</code> — proves <code>cookies()</code> from{' '}
          <code>next/headers</code> can <strong>write</strong> in a Route Handler, unlike in a Server
          Component.
        </li>
      </ul>
    </div>
  );
}
