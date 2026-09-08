'use client';

import { incrementFromClientForm } from './actions';

// A Client Component rendering <form action={realAction}> directly — the
// action itself is un-wrapped, same as ServerForm.tsx. What differs is only
// which component owns the <form>, not what the action is.
export default function ClientForm() {
  return (
    <form action={incrementFromClientForm}>
      <button type="submit">Increment (Client Component form, same kind of real action)</button>
    </form>
  );
}
