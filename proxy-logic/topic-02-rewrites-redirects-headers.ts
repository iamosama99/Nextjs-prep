import { NextResponse, type NextRequest } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/02-rewrites-redirects-headers';

export function runTopic02(request: NextRequest, pathname: string) {
  if (!pathname.startsWith(PREFIX)) return undefined;

  // Redirect: the browser's own URL bar changes to /new-page.
  if (pathname === `${PREFIX}/old-page`) {
    return NextResponse.redirect(new URL(`${PREFIX}/new-page`, request.url));
  }

  // Rewrite: the browser's URL bar STAYS at /rewrite-me — only the content
  // served changes, transparently, to whatever /actual-content returns.
  if (pathname === `${PREFIX}/rewrite-me`) {
    return NextResponse.rewrite(new URL(`${PREFIX}/actual-content`, request.url));
  }

  // Headers: sets a REQUEST header (forwarded upstream, never sent to the
  // client) and a RESPONSE header (sent to the client, never seen upstream)
  // — deliberately using the docs' NextResponse.next({ request: { headers } })
  // form for the former, not the discouraged NextResponse.next({ headers }).
  if (pathname === `${PREFIX}/headers-demo`) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-hello-from-proxy-upstream', 'hello-request');

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('x-hello-from-proxy-response', 'hello-response');
    return response;
  }

  return undefined;
}
