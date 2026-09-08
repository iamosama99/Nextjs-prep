import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/06-middleware-to-proxy-migration';

// waitUntil() extends this invocation's lifetime for background work WITHOUT
// making the client wait for it — the response below goes out immediately,
// regardless of how long the fetch inside waitUntil takes to settle.
export function runTopic06(request: NextRequest, event: NextFetchEvent, pathname: string) {
  if (pathname !== `${PREFIX}/waituntil-demo`) return undefined;

  event.waitUntil(fetch(new URL(`${PREFIX}/api/hits`, request.url), { method: 'POST' }));

  return NextResponse.next();
}
