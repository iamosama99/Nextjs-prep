import { NextResponse, type NextRequest } from 'next/server';
import { runTopic01 } from './proxy-logic/topic-01-basics';

// Only ONE proxy.ts is allowed per project — the docs' own recommendation is
// to break logic into modules and compose them here, aggregated for
// centralized control. Every Phase 7 topic's demo logic lives in
// ./proxy-logic/ and gets dispatched from this single function based on
// pathname, rather than each topic getting its own isolated proxy file the
// way every other phase's topics could.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const topic01 = runTopic01(request, pathname);
  if (topic01) return topic01;

  return NextResponse.next();
}

// Scoped to this phase's playground routes only — verified directly (see
// Topic 1's notes) that requests outside this prefix never reach any of the
// logic above at all, not just that the logic happens to no-op for them.
export const config = {
  matcher: ['/playground/phase-07-proxy-edge/:path*'],
};
