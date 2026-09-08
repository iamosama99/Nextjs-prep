// Multiple dynamic segments resolve as multiple keys on the same params object.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag: string; item: string }> }
) {
  const { tag, item } = await params;
  return Response.json({ tag, item });
}
