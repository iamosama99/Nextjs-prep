'use server';

import { updateTag, revalidateTag, revalidatePath, refresh } from 'next/cache';
import { bumpMutationCount } from './store';

const PATH = '/playground/phase-05-server-actions/06-revalidating-after-mutation';

// Read-your-own-writes: expires the 'headline' tag immediately. Per the
// single-response model (Topic 1), this bundles a fresh re-render of the
// current route into THIS action's own response.
export async function mutateThenUpdateTag() {
  bumpMutationCount();
  updateTag('headline');
}

// Stale-while-revalidate: per the docs, this does NOT bundle a re-render into
// the action's own response — the one explicit exception among these four,
// but that specifically describes the JS-hydrated RPC dispatch path (a real
// browser, already hydrated, making a fetch-based action call). This demo's
// no-JS fallback form still shows fresh content after clicking this button —
// verified for real — because the fallback response is a single, always-
// fresh full-page render where the read naturally happens after the tag was
// just invalidated, not two separate messages the way the RPC path works.
export async function mutateThenRevalidateTag() {
  bumpMutationCount();
  revalidateTag('headline', 'max');
}

// Invalidates by path instead of by tag — broader, but still bundles an
// immediate re-render, same as updateTag.
export async function mutateThenRevalidatePath() {
  bumpMutationCount();
  revalidatePath(PATH);
}

// Re-renders the current route's RSC payload WITHOUT invalidating any cached
// data. The plain mutationCount (never cached) should reflect the mutation;
// the cached headline should NOT change, since nothing invalidated it.
export async function mutateThenRefresh() {
  bumpMutationCount();
  refresh();
}
