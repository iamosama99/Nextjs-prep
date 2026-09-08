import { NextResponse } from 'next/server';

// NextResponse.cookies is how a Route Handler actually sets a cookie on the
// OUTGOING response — this is what produces a real Set-Cookie header,
// verified via `curl -i`.
export async function GET() {
  const response = NextResponse.json({ set: 'demo_pref=dark' });
  response.cookies.set('demo_pref', 'dark');
  return response;
}
