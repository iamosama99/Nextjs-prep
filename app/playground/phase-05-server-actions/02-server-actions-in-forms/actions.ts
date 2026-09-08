'use server';

import { revalidatePath } from 'next/cache';
import { createPost, setStatus, upvote } from './store';

const PATH = '/playground/phase-05-server-actions/02-server-actions-in-forms';

// Called directly by <form action={createDraft}> — receives the form's
// FormData automatically, no wiring required.
export async function createDraft(formData: FormData) {
  const raw = Object.fromEntries(formData);
  createPost(String(raw.title ?? ''), String(raw.content ?? ''));
  revalidatePath(PATH);
}

// Bound with an id via .bind(null, post.id) before being handed to a form —
// the id becomes this function's first argument at call time, never a form field.
export async function saveDraft(id: string) {
  setStatus(id, 'draft');
  revalidatePath(PATH);
}

export async function publish(id: string) {
  setStatus(id, 'published');
  revalidatePath(PATH);
}

export async function upvotePost(id: string) {
  upvote(id);
  revalidatePath(PATH);
}
