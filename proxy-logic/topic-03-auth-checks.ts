import { NextResponse, type NextRequest } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/03-auth-checks-in-proxy';
const PROTECTED = [`${PREFIX}/dashboard`];
const PUBLIC_AUTH_PAGES = [`${PREFIX}/login`];

// Optimistic check ONLY: reads whether the session cookie is present, with
// no decryption and no database call. A real app would still decrypt/verify
// the cookie's payload here (the docs' authentication.md example does) —
// this demo keeps it to presence-only to isolate the proxy mechanics from
// session-crypto plumbing, but the "no DB call" constraint is the real,
// load-bearing rule: proxy runs on every matched request, including
// prefetches, so a database round trip here is a genuine performance risk,
// not just a style preference.
export function runTopic03(request: NextRequest, pathname: string) {
  if (!pathname.startsWith(PREFIX)) return undefined;

  const hasSession = request.cookies.has('demo_proxy_session');

  if (PROTECTED.includes(pathname) && !hasSession) {
    return NextResponse.redirect(new URL(`${PREFIX}/login`, request.url));
  }

  if (PUBLIC_AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL(`${PREFIX}/dashboard`, request.url));
  }

  return undefined;
}
