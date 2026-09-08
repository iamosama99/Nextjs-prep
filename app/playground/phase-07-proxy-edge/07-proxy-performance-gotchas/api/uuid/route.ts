// A fresh value every call — used to prove (or disprove) whether fetch()
// cache options have any effect when the fetch happens inside proxy.
export async function GET() {
  return Response.json({ uuid: crypto.randomUUID() });
}
