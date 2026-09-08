import { cookies } from 'next/headers';
import { USERS, type UserId } from './store';

// A deliberately minimal stand-in for a real session (Phase 10 covers actual
// auth). The point here isn't how sessions work — it's that reading identity
// from a cookie the SERVER set, rather than trusting anything the client
// claims about itself, is what makes this a legitimate check at all.
export async function getCurrentUserId(): Promise<UserId | null> {
  const store = await cookies();
  const id = store.get('demo_user')?.value;
  return id === 'alice' || id === 'bob' ? id : null;
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  return id ? { id, ...USERS[id] } : null;
}
