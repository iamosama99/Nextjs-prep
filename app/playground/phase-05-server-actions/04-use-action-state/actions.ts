'use server';

import { revalidatePath } from 'next/cache';
import { createAccount } from './store';

const PATH = '/playground/phase-05-server-actions/04-use-action-state';

export type SignupState = {
  errors: { email?: string; password?: string };
  message: string;
};

// useActionState changes this function's signature: the first argument is no
// longer FormData — it's the previous state, with FormData shifted to second.
export async function signup(prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const errors: SignupState['errors'] = {};
  if (!email.includes('@')) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (Object.keys(errors).length > 0) {
    return { errors, message: '' };
  }

  createAccount(email);
  revalidatePath(PATH);
  return { errors: {}, message: `Account created for ${email}.` };
}
