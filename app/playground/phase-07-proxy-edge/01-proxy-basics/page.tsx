export default function ProxyBasicsPage() {
  return (
    <div>
      <h1>Proxy Basics &amp; the `matcher` Config</h1>
      <p>
        This page itself is the demo — the interesting part is in the response headers, not the rendered
        HTML. Run <code>curl -i</code> against this page&apos;s URL and check for{' '}
        <code>x-proxy-basics: ran</code>. Then <code>curl -i</code> a route from a different phase (Phase
        6, say) and confirm the header is genuinely absent — proof the <code>matcher</code> scopes
        execution, not just that the logic happens to no-op elsewhere.
      </p>
    </div>
  );
}
