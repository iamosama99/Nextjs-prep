import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

// A minimal Route Handler used only as plumbing for this demo — Route Handlers
// are covered properly in Phase 6. All it does is flip the "theme" cookie so
// the ThemeInfo component on the demo page has something to stream in.
export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('value') ?? 'light';
  const cookieStore = await cookies();
  cookieStore.set('theme', value);
  redirect('/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary');
}
