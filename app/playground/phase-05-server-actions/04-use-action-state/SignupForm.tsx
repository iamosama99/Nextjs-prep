'use client';

import { useActionState } from 'react';
import { signup, type SignupState } from './actions';

const initialState: SignupState = { errors: {}, message: '' };

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction}>
      <div style={{ marginBottom: 8 }}>
        <label htmlFor="email">Email</label>
        <br />
        <input id="email" name="email" type="text" defaultValue="not-an-email" />
        {state.errors.email && <p style={{ color: '#e00', margin: '4px 0' }}>{state.errors.email}</p>}
      </div>
      <div style={{ marginBottom: 8 }}>
        <label htmlFor="password">Password</label>
        <br />
        <input id="password" name="password" type="password" defaultValue="short" />
        {state.errors.password && <p style={{ color: '#e00', margin: '4px 0' }}>{state.errors.password}</p>}
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Sign up'}
      </button>
      <p aria-live="polite" style={{ minHeight: '1.2em' }}>
        {state.message}
      </p>
    </form>
  );
}
