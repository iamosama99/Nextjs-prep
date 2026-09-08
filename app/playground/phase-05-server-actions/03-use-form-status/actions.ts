'use server';

import { revalidatePath } from 'next/cache';
import { writeSaved } from './store';

const PATH = '/playground/phase-05-server-actions/03-use-form-status';

// Artificially slow so `pending` is actually observable in the UI — a real
// mutation (a slow write, a third-party API call) creates this same window
// without any extra code; this demo just makes it deliberate and consistent.
export async function slowSave(formData: FormData) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  writeSaved(String(formData.get('text') ?? ''));
  revalidatePath(PATH);
}
