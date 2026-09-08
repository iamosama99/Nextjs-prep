import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { runTopic01 } from './proxy-logic/topic-01-basics';
import { runTopic02 } from './proxy-logic/topic-02-rewrites-redirects-headers';
import { runTopic03 } from './proxy-logic/topic-03-auth-checks';
import { runTopic04 } from './proxy-logic/topic-04-geolocation-ab-testing';
import { runTopic06 } from './proxy-logic/topic-06-waituntil';
import { runTopic07 } from './proxy-logic/topic-07-performance';

// Only ONE proxy.ts is allowed per project — the docs' own recommendation is
// to break logic into modules and compose them here, aggregated for
// centralized control. Every Phase 7 topic's demo logic lives in
// ./proxy-logic/ and gets dispatched from this single function based on
// pathname, rather than each topic getting its own isolated proxy file the
// way every other phase's topics could.
// Marked async because Topic 7's fetch-cache check needs to await inside —
// per the docs, proxy "can be marked async if using await inside."
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  const topic01 = runTopic01(request, pathname);
  if (topic01) return topic01;

  const topic02 = runTopic02(request, pathname);
  if (topic02) return topic02;

  const topic03 = runTopic03(request, pathname);
  if (topic03) return topic03;

  const topic04 = runTopic04(request, pathname);
  if (topic04) return topic04;

  const topic06 = runTopic06(request, event, pathname);
  if (topic06) return topic06;

  const topic07 = await runTopic07(request, pathname);
  if (topic07) return topic07;

  return NextResponse.next();
}

// Scoped to this phase's playground routes only — verified directly (see
// Topic 1's notes) that requests outside this prefix never reach any of the
// logic above at all, not just that the logic happens to no-op for them.
export const config = {
  matcher: ['/playground/phase-07-proxy-edge/:path*'],
};
