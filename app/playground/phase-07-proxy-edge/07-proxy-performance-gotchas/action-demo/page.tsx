async function demoAction() {
  'use server';
  // No-op — this page exists to prove proxy sees the POST this action
  // compiles down to, not to demonstrate the action's own effect.
}

export default function ActionDemoPage() {
  return (
    <div>
      <h1>Server Action Proxy Coverage</h1>
      <p>
        This form&apos;s Server Action POSTs to this exact page&apos;s own path. `curl -i` a raw POST here
        (see the notes) and check for <code>x-proxy-saw-post-to-page-route</code> — proof proxy treats a
        Server Action call the same as any other request to a path its matcher covers.
      </p>
      <form action={demoAction}>
        <button type="submit">Run Server Action</button>
      </form>
    </div>
  );
}
