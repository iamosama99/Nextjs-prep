import { type NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

// A stand-in for a real secret — in a real project this comes from
// process.env, never hardcoded. This route mirrors the exact "webhook that
// revalidates on content change" pattern from the docs, verified for real.
const REVALIDATE_SECRET_TOKEN = 'demo-secret-token';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== REVALIDATE_SECRET_TOKEN) {
    return NextResponse.json({ success: false, reason: 'invalid token' }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get('tag');
  if (!tag) {
    return NextResponse.json({ success: false, reason: 'missing tag' }, { status: 400 });
  }

  revalidateTag(tag, 'max');
  return NextResponse.json({ success: true, tag });
}
