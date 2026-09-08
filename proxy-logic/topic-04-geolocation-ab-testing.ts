import { NextResponse, type NextRequest } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/04-geolocation-ab-testing';

export function runTopic04(request: NextRequest, pathname: string) {
  if (!pathname.startsWith(PREFIX)) return undefined;

  // request.geo / request.ip were removed from NextRequest in Next.js 15 —
  // those values were always supplied by the HOSTING PLATFORM, never
  // computed by Next.js itself, so the fix was reading the platform's own
  // header directly instead of a Next.js convenience property. This demo
  // reads a Vercel-style header name as the illustrative example; on Vercel
  // specifically, @vercel/functions' geolocation()/ipAddress() helpers wrap
  // the same headers. Self-hosted with nothing in front, the header is
  // simply absent — verified below by setting it manually via curl to
  // prove the READ mechanism, not by claiming real geolocation happens here.
  if (pathname === `${PREFIX}/geo`) {
    const country = request.headers.get('x-vercel-ip-country') ?? request.headers.get('x-demo-country');
    const response = NextResponse.next();
    response.headers.set('x-resolved-country', country ?? 'unknown');
    return response;
  }

  // A/B testing via cookie-bucketing + rewrite (Topic 2's rewrite mechanism,
  // applied): first visit assigns a bucket and sets a cookie so the same
  // visitor keeps seeing the same variant; the URL never changes either way.
  if (pathname === `${PREFIX}/ab-test`) {
    const existingBucket = request.cookies.get('ab_bucket')?.value;
    const bucket = existingBucket === 'a' || existingBucket === 'b' ? existingBucket : Math.random() < 0.5 ? 'a' : 'b';

    const response = NextResponse.rewrite(new URL(`${PREFIX}/ab-test/variant-${bucket}`, request.url));
    if (!existingBucket) {
      response.cookies.set('ab_bucket', bucket);
    }
    return response;
  }

  return undefined;
}
