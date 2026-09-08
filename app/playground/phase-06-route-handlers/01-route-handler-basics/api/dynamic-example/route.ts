// A non-deterministic operation. Prerendering stops here during the build
// and defers to request-time rendering — the docs' exact example. Verify via
// the build's route table: this should show ƒ (fully dynamic, no cacheable
// static shell — a Route Handler has no HTML shell to partially prerender).
export async function GET() {
  return Response.json({ randomNumber: Math.random() });
}
