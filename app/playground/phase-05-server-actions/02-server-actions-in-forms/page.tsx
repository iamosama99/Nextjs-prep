import { Suspense } from 'react';
import { createDraft } from './actions';
import PostList from './PostList';

export default function ServerActionsInFormsPage() {
  return (
    <div>
      <h1>Calling Server Actions from Forms</h1>
      <p>
        Every form and button below is wired to a Server Action, and this entire page works with
        JavaScript disabled — nothing here needs hydration to function (Topic 8 covers why in full).
      </p>

      <section style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
        <h2>FormData extraction</h2>
        <p>
          <code>createDraft</code> receives the form&apos;s <code>FormData</code> automatically — no
          client-side wiring, no <code>onSubmit</code> handler.
        </p>
        <form action={createDraft}>
          <div>
            <input name="title" placeholder="Title" required style={{ width: '100%', marginBottom: 8 }} />
          </div>
          <div>
            <textarea
              name="content"
              placeholder="Content"
              required
              style={{ width: '100%', marginBottom: 8 }}
            />
          </div>
          <button type="submit">Create draft</button>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Posts</h2>
        <p>
          Each post has two more patterns: <strong>Save as draft / Publish</strong> are two buttons on
          one form, each bound to a different action via <code>formAction</code>. <strong>Upvote</strong>{' '}
          is a separate form whose action is bound with the post&apos;s id via{' '}
          <code>.bind(null, post.id)</code> — the id becomes an argument, never a form field.
        </p>
        <Suspense fallback={<p>Loading posts...</p>}>
          <PostList />
        </Suspense>
      </section>
    </div>
  );
}
