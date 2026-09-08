import { NextResponse } from 'next/server';

const PREFIX = '/playground/phase-07-proxy-edge/03-auth-checks-in-proxy';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL(`${PREFIX}/login`, request.url));
  response.cookies.delete('demo_proxy_session');
  return response;
}
