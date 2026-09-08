import { incrementFromServerForm } from './actions';

// A Server Component rendering <form action={realAction}> directly.
export default function ServerForm() {
  return (
    <form action={incrementFromServerForm}>
      <button type="submit">Increment (Server Component form)</button>
    </form>
  );
}
