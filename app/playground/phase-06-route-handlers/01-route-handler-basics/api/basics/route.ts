export async function GET() {
  return Response.json({ message: 'Hello from GET' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return Response.json({ message: 'Hello from POST', received: body });
}

// No PUT/DELETE/PATCH/OPTIONS defined here on purpose. Next.js returns a
// real 405 for the unimplemented methods, and auto-implements OPTIONS with
// an Allow header listing exactly GET, POST, and HEAD (HEAD comes free with
// GET) — both verified for real against a running server.
