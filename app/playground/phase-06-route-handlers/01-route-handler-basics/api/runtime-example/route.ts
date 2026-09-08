import { headers } from 'next/headers';

// Accesses a runtime (Request-time) API. Prerendering terminates here just
// as it would for a UI route reading headers()/cookies() (Phase 3 Topic 2).
export async function GET() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');
  return Response.json({ userAgent });
}
