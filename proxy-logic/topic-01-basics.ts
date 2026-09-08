import { NextResponse, type NextRequest } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/01-proxy-basics';

// Topic 1 demo: proves the matcher genuinely scopes execution. This only
// contributes a response header when the pathname falls under PREFIX —
// verified by its ABSENCE on every other path this proxy's matcher covers.
export function runTopic01(request: NextRequest, pathname: string) {
  if (!pathname.startsWith(PREFIX)) return undefined;

  const response = NextResponse.next();
  response.headers.set('x-proxy-basics', 'ran');
  return response;
}
