import { cacheLife, cacheTag } from 'next/cache';

// Long-lived, tagged cache entry — on its own it would barely ever change.
// This is what updateTag/revalidateTag/revalidatePath all invalidate,
// each in a different way (see actions.ts).
export async function getHeadline() {
  'use cache';
  cacheLife('max');
  cacheTag('headline');
  return { text: `Headline generated at ${new Date().toISOString()}`, id: crypto.randomUUID() };
}
