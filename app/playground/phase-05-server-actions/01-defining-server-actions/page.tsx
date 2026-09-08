import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';
import Counters from './Counters';
import FileLevelButton from './FileLevelButton';
import { incrementInline } from './store';

// Inline 'use server': legal only inside a Server Component file, defined
// directly in the body of an async function. It can close over anything in
// this module's scope (imports, local variables) — Next.js encrypts any local
// variables it captures before the client reference ships (Topic 7 covers the
// security model in full; this demo only defines, it doesn't need to prove
// that part live).
async function incrementInlineAction() {
  'use server';
  incrementInline();
  // Forces a fresh render of this route in the same response so the count
  // updates immediately — Phase 5 Topic 6 covers revalidation choices in depth.
  revalidatePath('/playground/phase-05-server-actions/01-defining-server-actions');
}

export default function DefiningServerActionsPage() {
  return (
    <div>
      <h1>Defining Server Actions</h1>
      <p>
        Two counters, two ways of defining the exact same kind of thing — a Server Function marked with{' '}
        <code>&apos;use server&apos;</code>. Neither button&apos;s implementation ever ships to the browser;
        only a reference (an action ID) does.
      </p>

      <Suspense fallback={<p>Loading counts...</p>}>
        <Counters />
      </Suspense>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>Inline &apos;use server&apos; — defined in this Server Component</h2>
        <p>
          <code>incrementInlineAction</code> is defined directly inside <code>page.tsx</code> and passed
          straight to a plain HTML <code>&lt;form action&gt;</code>. It works even before any client JS has
          hydrated.
        </p>
        <form action={incrementInlineAction}>
          <button type="submit">Increment (inline action, form)</button>
        </form>
      </section>

      <section style={{ border: '1px solid #e00', padding: 12, marginTop: 16 }}>
        <h2>File-level &apos;use server&apos; — actions.ts, imported into a Client Component</h2>
        <p>
          <code>incrementFileLevelCounter</code> lives in <code>actions.ts</code>, a file whose{' '}
          <em>only</em> content is exports marked <code>&apos;use server&apos;</code> at the top of the file.
          That&apos;s the only way <code>FileLevelButton</code> (a Client Component) can call it — it&apos;s
          imported, not defined, here.
        </p>
        <FileLevelButton />
      </section>
    </div>
  );
}
