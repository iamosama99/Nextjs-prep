import { io } from 'next/cache';
import { listPosts } from './store';
import { saveDraft, publish, upvotePost } from './actions';

// io() forces this to run per-request instead of freezing at build time
// (see Phase 3 Topic 1) — otherwise the list would never show new posts.
export default async function PostList() {
  await io();
  const posts = listPosts();

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {posts.map((post) => (
        <li key={post.id} style={{ border: '1px solid #999', padding: 12, marginTop: 8 }}>
          <h3>
            {post.title} — <em>{post.status}</em> — {post.votes} vote{post.votes === 1 ? '' : 's'}
          </h3>
          <p>{post.content}</p>

          {/* Nested form elements: one form, two buttons, two different bound
              actions. saveDraft is the form's default action (Enter key);
              Publish overrides it via formAction on that one button. */}
          <form style={{ display: 'inline-block', marginRight: 8 }} action={saveDraft.bind(null, post.id)}>
            <button type="submit">Save as draft</button>
            <button type="submit" formAction={publish.bind(null, post.id)}>
              Publish
            </button>
          </form>

          {/* bind() passing an id that never appears as a form field. */}
          <form style={{ display: 'inline-block' }} action={upvotePost.bind(null, post.id)}>
            <button type="submit">Upvote</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
