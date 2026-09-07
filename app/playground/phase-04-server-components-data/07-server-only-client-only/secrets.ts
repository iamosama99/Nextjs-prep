import 'server-only';

// Exercise: temporarily create a Client Component (a new file with 'use
// client') that imports getApiKeyStatus from here, render it from page.tsx,
// and run `npm run build`. You'll get a build error naming this import —
// server-only enforcing that this module can never reach the client graph.
// Revert afterward.
export function getApiKeyStatus() {
  // No NEXT_PUBLIC_ prefix -- this must never be read from client code.
  const key = process.env.DEMO_SECRET_KEY;
  return key ? 'configured' : 'not configured (expected in this demo)';
}
