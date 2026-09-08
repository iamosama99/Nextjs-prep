import { slowSave } from './actions';
import SubmitButton from './SubmitButton';

// A Server Component — it doesn't need useFormStatus itself, it just renders
// the <form> and delegates the status-aware button to a Client Component child.
export default function CorrectForm() {
  return (
    <form action={slowSave}>
      <input name="text" placeholder="Text to save" defaultValue="Correct placement demo" />
      <SubmitButton />
    </form>
  );
}
