// The "raw row" — has fields that must never cross into UserBadge's props.
type RawUserRow = {
  name: string;
  bio: string;
  passwordHash: string;
};

// A class instance — used by the exercise below to demonstrate a genuine
// serialization failure. Class instances cannot cross from a Server
// Component to a Client Component as props.
export class Money {
  constructor(private cents: number) {}
  format() {
    return `$${(this.cents / 100).toFixed(2)}`;
  }
}

export async function getRawRow(): Promise<RawUserRow> {
  return { name: 'Ada Lovelace', bio: 'Mathematician and writer.', passwordHash: 'never-cross-the-boundary' };
}
