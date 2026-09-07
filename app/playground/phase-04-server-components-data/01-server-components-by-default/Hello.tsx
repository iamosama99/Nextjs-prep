'use client';

// Logs on the server during the initial render (check your terminal after a
// direct visit) AND in the browser during hydration (check the browser
// console) — because a Client Component runs in both places, not just the
// browser. On a client-side navigation to this route, only the browser log
// appears, since the server just sends the RSC Payload for that navigation.
export default function Hello() {
  console.log('[Hello] Client Component rendered');
  return <p>Hello from a Client Component — check both the terminal and the browser console.</p>;
}
