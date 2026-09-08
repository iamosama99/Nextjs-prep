import { cacheLife, cacheTag } from 'next/cache';

export async function getContent() {
  'use cache';
  cacheLife('max');
  cacheTag('webhook-demo');
  return { text: `Content generated at ${new Date().toISOString()}` };
}
