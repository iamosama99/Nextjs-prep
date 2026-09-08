'use server';

import { revalidatePath } from 'next/cache';
import { bumpServerFormCount, bumpClientFormCount, bumpOnClickCount } from './store';

const PATH = '/playground/phase-05-server-actions/08-progressive-enhancement';

// A real, un-wrapped Server Function — passed straight to a <form action>
// from a Server Component below.
export async function incrementFromServerForm() {
  bumpServerFormCount();
  revalidatePath(PATH);
}

// The exact same kind of real, un-wrapped Server Function — but this one is
// imported and passed straight to a <form action> from a CLIENT Component
// instead. Nothing about the action itself differs from the one above.
export async function incrementFromClientForm() {
  bumpClientFormCount();
  revalidatePath(PATH);
}

// Called via onClick, not a <form> at all.
export async function incrementFromOnClick() {
  bumpOnClickCount();
  revalidatePath(PATH);
}
