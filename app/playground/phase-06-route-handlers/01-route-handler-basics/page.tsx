export default function RouteHandlerBasicsPage() {
  return (
    <div>
      <h1>Route Handler Basics</h1>
      <p>
        This topic has no interactive UI of its own — the demo is four <code>route.ts</code> files under{' '}
        <code>./api/</code>, meant to be hit directly (or via the notes&apos; <code>curl</code>{' '}
        commands), not clicked:
      </p>
      <ul>
        <li>
          <code>/playground/phase-06-route-handlers/01-route-handler-basics/api/basics</code> —{' '}
          <code>GET</code>/<code>POST</code> defined; try <code>PUT</code> for a real 405, or an{' '}
          <code>OPTIONS</code> request for the auto-generated <code>Allow</code> header.
        </li>
        <li>
          <code>.../api/static-example</code> — no dynamic data; prerendered once at build time (○ in{' '}
          <code>npm run build</code>&apos;s route table).
        </li>
        <li>
          <code>.../api/dynamic-example</code> — calls <code>Math.random()</code>; fully dynamic (ƒ).
        </li>
        <li>
          <code>.../api/runtime-example</code> — reads <code>headers()</code>; fully dynamic (ƒ) for the
          same reason a UI route reading a runtime API is (Phase 3 Topic 2).
        </li>
      </ul>
    </div>
  );
}
