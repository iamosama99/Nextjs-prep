'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './session';
import { deleteDoc, listDocs, wipeRecords, type UserId } from './store';

const PATH = '/playground/phase-05-server-actions/07-server-action-security';

export async function login(userId: UserId) {
  const store = await cookies();
  store.set('demo_user', userId);
  revalidatePath(PATH);
}

export async function logout() {
  const store = await cookies();
  store.delete('demo_user');
  revalidatePath(PATH);
}

// VULNERABLE ON PURPOSE. This page only renders the matching UI button for
// admins, but a page-level check does not extend to the action itself — this
// is directly reachable via POST by anyone, admin or not, verified for real.
export async function wipeRecordsUnsafe() {
  wipeRecords();
  revalidatePath(PATH);
}

// SAFE: re-verifies authorization inside the action itself, because the page
// render and this action are separate entry points.
export async function wipeRecordsSafe() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    throw new Error('Unauthorized: admin only.');
  }
  wipeRecords();
  revalidatePath(PATH);
}

// VULNERABLE ON PURPOSE. Checks nothing at all — not even that a session
// exists — and deletes by id with no ownership check. Any caller can delete
// ANY document, not just their own: a textbook IDOR.
export async function deleteDocUnsafe(id: string) {
  deleteDoc(id);
  revalidatePath(PATH);
}

// SAFE: re-checks authentication AND that the caller owns this specific
// resource. The id is trusted only as "which resource," never as
// "permission to act on it."
export async function deleteDocSafe(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized.');
  }
  const doc = listDocs().find((d) => d.id === id);
  if (!doc) return;
  if (doc.ownerId !== user.id) {
    throw new Error('Forbidden: not your document.');
  }
  deleteDoc(id);
  revalidatePath(PATH);
}
