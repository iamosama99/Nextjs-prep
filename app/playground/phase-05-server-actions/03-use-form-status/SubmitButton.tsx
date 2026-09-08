'use client';

import { useFormStatus } from 'react-dom';

// Correct placement: this component is a CHILD of the <form>, rendered by a
// different component than the one that owns the <form> element. That's what
// makes useFormStatus's context read actually resolve to that form's status.
export default function SubmitButton() {
  const { pending, method } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? `Saving... (method: ${method ?? 'n/a'})` : 'Save (correct placement)'}
    </button>
  );
}
