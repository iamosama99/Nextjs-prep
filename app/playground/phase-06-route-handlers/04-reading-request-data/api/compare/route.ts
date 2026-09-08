import { headers, cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

// Every field below is read TWO (or three) genuinely redundant ways, on
// purpose — this route exists to prove they agree, not to recommend mixing
// styles in real code.
export async function GET(request: NextRequest) {
  // Search params: NextRequest's parsed nextUrl vs. a manually constructed URL.
  const viaNextUrl = request.nextUrl.searchParams.get('q');
  const viaManualUrl = new URL(request.url).searchParams.get('q');

  // Headers: next/headers' headers() (also usable in Server Components) vs.
  // the plain Headers object living directly on the request.
  const viaNextHeaders = (await headers()).get('x-demo-header');
  const viaRequestHeaders = request.headers.get('x-demo-header');

  // Cookies: next/headers' cookies() (read here) vs. request.cookies —
  // reading the same incoming Cookie header two different ways.
  const viaNextCookiesRead = (await cookies()).get('demo')?.value ?? null;
  const viaRequestCookies = request.cookies.get('demo')?.value ?? null;

  return NextResponse.json({
    searchParams: { viaNextUrl, viaManualUrl },
    headers: { viaNextHeaders, viaRequestHeaders },
    cookies: { viaNextCookiesRead, viaRequestCookies },
  });
}
