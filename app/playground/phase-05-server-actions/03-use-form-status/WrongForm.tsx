'use client';

import { useFormStatus } from 'react-dom';
import { slowSave } from './actions';

// Common mistake: calling useFormStatus in the SAME component that renders
// the <form>. This component is the form's owner, not one of its children —
// useFormStatus() here never sees that form's submission, so `pending` stays
// false the entire time the action is running.
export default function WrongForm() {
  const { pending } = useFormStatus();
  return (
    <form action={slowSave}>
      <input name="text" placeholder="Text to save" defaultValue="Wrong placement demo" />
      <button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save (wrong placement — never shows pending)'}
      </button>
    </form>
  );
}
