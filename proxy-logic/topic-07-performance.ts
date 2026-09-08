import { NextResponse, type NextRequest } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/07-proxy-performance-gotchas';

export async function runTopic07(request: NextRequest, pathname: string) {
  if (!pathname.startsWith(PREFIX)) return undefined;

  // Server Functions POST to the exact page path that defines them — proxy
  // sees that POST the same way it sees any other request to that path.
  // A matcher covering this page covers its Server Actions too; one that
  // doesn't, silently doesn't.
  if (pathname === `${PREFIX}/action-demo` && request.method === 'POST') {
    const response = NextResponse.next();
    response.headers.set('x-proxy-saw-post-to-page-route', 'true');
    return response;
  }

  // The docs state fetch() cache options have no effect in Proxy — verified
  // here directly rather than assumed: this fetch requests a 60s revalidate
  // window, then the response exposes what it actually got back.
  if (pathname === `${PREFIX}/fetch-cache-check`) {
    const res = await fetch(new URL(`${PREFIX}/api/uuid`, request.url), {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const response = NextResponse.next();
    response.headers.set('x-fetched-uuid', data.uuid);
    return response;
  }

  return undefined;
}
