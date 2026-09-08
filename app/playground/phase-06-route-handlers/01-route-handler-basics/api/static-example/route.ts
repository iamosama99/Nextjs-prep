// No uncached or runtime data access — under Cache Components this
// prerenders once at build time, exactly like a static UI route (Phase 3
// Topic 1). Verify via `npm run build`'s route table: this should show ○.
export async function GET() {
  return Response.json({ projectName: 'Next.js Interview Prep' });
}
