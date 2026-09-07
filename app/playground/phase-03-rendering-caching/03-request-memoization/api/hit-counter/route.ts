import { headers } from 'next/headers';

// A minimal Route Handler used only as plumbing for this demo — Route Handlers
// are covered properly in Phase 6. It increments an in-memory counter on every
// hit so the page can prove whether two fetch() calls to this URL in one
// render pass produce one request or two.
//
// Under Cache Components, a GET handler with no uncached/runtime data access
// prerenders once at build time — which would freeze this counter forever.
// Reading headers() (a Request-time API) forces it to run per request instead.
let hitCount = 0;

export async function GET() {
  await headers();
  hitCount += 1;
  return Response.json({ count: hitCount });
}
