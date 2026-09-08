// params is a Promise — must be awaited, exactly like a dynamic page segment
// (Phase 2 Topic 5), because Next.js can't guarantee it's resolved before
// the handler runs (an intercepted/parallel route can still be "loading").
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return Response.json({ slug });
}
