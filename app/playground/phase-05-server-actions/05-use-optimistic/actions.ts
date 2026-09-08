'use server';

import { revalidatePath } from 'next/cache';
import { addMessage } from './store';

const PATH = '/playground/phase-05-server-actions/05-use-optimistic';

// Artificial latency so the optimistic flash is actually visible, plus a
// deliberate failure case (any message containing "fail") so the demo can
// show useOptimistic reverting when the server disagrees, not just when it
// agrees.
export async function send(text: string) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (text.toLowerCase().includes('fail')) {
    throw new Error('The server rejected this message (demo: text contains "fail").');
  }
  addMessage(text);
  revalidatePath(PATH);
}
