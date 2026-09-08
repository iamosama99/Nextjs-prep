export default function CorsAndWebhooksPage() {
  return (
    <div>
      <h1>CORS &amp; Webhooks in Route Handlers</h1>
      <p>Curl these:</p>
      <ul>
        <li>
          <code>.../api/cors</code> — a real preflight <code>OPTIONS</code> request (with{' '}
          <code>Origin</code> and <code>Access-Control-Request-Method</code>) followed by the actual{' '}
          <code>GET</code>.
        </li>
        <li>
          <code>.../api/content</code> then <code>.../api/webhook-callback?token=...&amp;tag=webhook-demo</code>{' '}
          then <code>.../api/content</code> again — a token-gated revalidation webhook.
        </li>
        <li>
          <code>.../api/webhook-payload</code> — a <code>POST</code> receiving an arbitrary JSON payload.
        </li>
      </ul>
    </div>
  );
}
