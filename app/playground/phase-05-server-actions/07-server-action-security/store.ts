// Shared in-memory state for this demo only — resets on server restart/rebuild.
export type UserId = 'alice' | 'bob';

export const USERS: Record<UserId, { name: string; isAdmin: boolean }> = {
  alice: { name: 'Alice', isAdmin: true },
  bob: { name: 'Bob', isAdmin: false },
};

export type Doc = { id: string; title: string; ownerId: UserId };

let docs: Doc[] = [
  { id: 'd1', title: "Alice's private note", ownerId: 'alice' },
  { id: 'd2', title: "Bob's private note", ownerId: 'bob' },
];

export function listDocs() {
  return docs;
}

export function deleteDoc(id: string) {
  docs = docs.filter((d) => d.id !== id);
}

let recordsWiped = false;

export function wipeRecords() {
  recordsWiped = true;
}

export function readRecordsWiped() {
  return recordsWiped;
}
