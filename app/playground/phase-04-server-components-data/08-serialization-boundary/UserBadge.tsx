'use client';

import { useState } from 'react';

// A Client Component with a narrow prop type — only what it actually
// renders. This narrowness is deliberate: it makes "accidentally pass the
// whole raw row" a type error instead of a habit (see the notes' bad/good
// example).
export default function UserBadge({ name, bio }: { name: string; bio: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ border: '1px solid #0070f3', padding: 12, marginTop: 16 }}>
      <h2>{name}</h2>
      <p>{bio}</p>
      <button onClick={() => setLiked((l) => !l)}>{liked ? 'Liked' : 'Like'}</button>
    </div>
  );
}
