// The other common webhook shape: a third-party service POSTs an arbitrary
// payload (Stripe, GitHub, a CMS) rather than pinging a GET callback URL.
// Unlike Pages Router API Routes, no bodyParser config is needed here.
export async function POST(request: Request) {
  try {
    const text = await request.text();
    const payload = JSON.parse(text);
    return Response.json({ received: true, keys: Object.keys(payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }
}
