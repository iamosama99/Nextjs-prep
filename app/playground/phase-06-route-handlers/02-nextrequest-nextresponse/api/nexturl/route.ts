import { type NextRequest, NextResponse } from 'next/server';

// request is typed NextRequest here instead of the plain Web Request — that
// alone is what makes .nextUrl available. Try /api/nexturl?name=lee
export async function GET(request: NextRequest) {
  return NextResponse.json({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    name: request.nextUrl.searchParams.get('name'),
    basePath: request.nextUrl.basePath,
  });
}
