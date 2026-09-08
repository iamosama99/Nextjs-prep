import { getContent } from '../../data';

export async function GET() {
  const content = await getContent();
  return Response.json(content);
}
