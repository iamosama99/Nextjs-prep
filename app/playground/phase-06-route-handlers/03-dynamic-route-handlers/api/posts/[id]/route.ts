import type { NextRequest } from 'next/server';
import { cacheLife } from 'next/cache';

// Pre-generate responses for these three ids at build time; any other id is
// still handled correctly, just rendered dynamically at request time instead
// (dynamicParams defaults to true — Phase 3 Topic 8 covers this for pages).
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }, { id: '3' }];
}

// 'use cache' can't sit directly in the exported GET below (Topic 1) — it
// has to live in this extracted helper instead.
async function getPost(id: string) {
  'use cache';
  cacheLife('max');
  return { id, title: `Post ${id}`, generatedAt: new Date().toISOString() };
}

// RouteContext<'...'> — the typed-helper alternative to writing out
// { params }: { params: Promise<{ id: string }> } by hand (both are shown
// across this topic's demo files; this is the route-literal-typed version).
export async function GET(_req: NextRequest, ctx: RouteContext<'/playground/phase-06-route-handlers/03-dynamic-route-handlers/api/posts/[id]'>) {
  const { id } = await ctx.params;
  const post = await getPost(id);
  return Response.json(post);
}
