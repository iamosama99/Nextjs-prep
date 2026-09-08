import { type NextRequest, NextResponse } from 'next/server';

// NextResponse.redirect() builds a real HTTP redirect response, constructed
// from a URL derived off this request's own nextUrl.
export async function GET(request: NextRequest) {
  const target = new URL(
    '/playground/phase-06-route-handlers/02-nextrequest-nextresponse/api/redirect-target',
    request.nextUrl
  );
  return NextResponse.redirect(target);
}
