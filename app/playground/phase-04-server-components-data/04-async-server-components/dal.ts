import { cache } from 'react';

// The "raw" data source — imagine this is a real database row, with fields
// nobody outside the server should ever see.
type RawUserRow = {
  id: string;
  name: string;
  bio: string;
  passwordHash: string;
  internalNotes: string;
};

async function queryRawUserRow(id: string): Promise<RawUserRow> {
  // Simulates a database round-trip.
  await new Promise((resolve) => setTimeout(resolve, 20));
  return {
    id,
    name: 'Ada Lovelace',
    bio: 'Mathematician and writer.',
    passwordHash: 'never-send-this-to-the-client',
    internalNotes: 'flagged for VIP support — never send this either',
  };
}

// The Data Access Layer function: wrapped in React.cache (Phase 3, Topic 4)
// so multiple components requesting the same id in one render share a
// single query, and — critically — it returns a minimal DTO, not the raw
// row. This is the shape a component should actually call.
export const getPublicProfile = cache(async (id: string) => {
  const row = await queryRawUserRow(id);
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    // passwordHash and internalNotes are deliberately left out — a
    // component-level `return row` here would ship both to the browser
    // the moment this DTO is passed to a Client Component.
  };
});
