import { type NextRequest, NextResponse } from 'next/server';

// request.cookies reads whatever cookie header the INCOMING request actually
// carried — this is the request-side mirror of NextResponse.cookies above.
export async function GET(request: NextRequest) {
  return NextResponse.json({
    demo_pref: request.cookies.get('demo_pref')?.value ?? null,
    hasCookie: request.cookies.has('demo_pref'),
  });
}
