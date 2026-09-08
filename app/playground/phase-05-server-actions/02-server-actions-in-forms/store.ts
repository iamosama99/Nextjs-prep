// Shared in-memory state for this demo only — resets on server restart/rebuild.
// A real app persists this in a database from inside the actions.
export type Post = {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  votes: number;
};

let posts: Post[] = [{ id: '1', title: 'Welcome', content: 'The first post.', status: 'published', votes: 0 }];
let nextId = 2;

export function listPosts() {
  return posts;
}

export function createPost(title: string, content: string) {
  posts = [...posts, { id: String(nextId++), title, content, status: 'draft', votes: 0 }];
}

export function setStatus(id: string, status: Post['status']) {
  posts = posts.map((p) => (p.id === id ? { ...p, status } : p));
}

export function upvote(id: string) {
  posts = posts.map((p) => (p.id === id ? { ...p, votes: p.votes + 1 } : p));
}
