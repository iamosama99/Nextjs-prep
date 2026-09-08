// Catch-all: slug resolves to an array of every matched segment.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return Response.json({ slug, joined: slug.join('/') });
}
