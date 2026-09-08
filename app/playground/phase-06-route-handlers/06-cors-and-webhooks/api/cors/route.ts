const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  return new Response(JSON.stringify({ message: 'Hello, cross-origin caller!' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// A real cross-origin request with a non-simple method/header triggers a
// browser preflight — an OPTIONS request asking permission before the real
// one. Topic 1's AUTO-implemented OPTIONS only sets a plain Allow header, no
// CORS headers — that's not enough for a real preflight to succeed, so this
// route defines OPTIONS explicitly instead of relying on the automatic one.
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
