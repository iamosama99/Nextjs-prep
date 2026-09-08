import { bumpHits, readHits } from '../../store';

export async function GET() {
  return Response.json({ hitCount: readHits() });
}

// Artificially slow (1s) so "the proxy's response returns before this
// finishes" is genuinely observable via timing, not just theoretically true.
export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const hitCount = bumpHits();
  return Response.json({ hitCount });
}
