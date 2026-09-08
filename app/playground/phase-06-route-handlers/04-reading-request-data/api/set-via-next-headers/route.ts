import { cookies } from 'next/headers';

// cookies() from next/headers is READ-ONLY in a Server Component (there's no
// response lifecycle to attach a Set-Cookie header to) but genuinely
// read+write here — a Route Handler, like a Server Action, produces a real
// response cookies() can mutate. Verify with `curl -i`: a real Set-Cookie
// header comes back, with no NextResponse/response.cookies involved at all.
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set('via_next_headers', 'yes');
  return Response.json({ set: true });
}
