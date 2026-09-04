import Link from 'next/link';

const photos = [1, 2, 3];

export default function Gallery() {
  return (
    <div>
      <p>
        Click a photo — it opens as a modal, the underlying gallery stays mounted, and the URL updates to{' '}
        <code>/photo/[id]</code>. Then try refreshing the page while the modal is open, or copy the URL into a
        new tab: you get the full standalone page instead, because a hard navigation bypasses interception
        entirely.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {photos.map((id) => (
          <Link
            key={id}
            href={`/playground/phase-02-app-router/08-intercepting-routes/photo/${id}`}
            style={{
              width: 100, height: 100, background: '#0070f3', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            Photo {id}
          </Link>
        ))}
      </div>
    </div>
  );
}
