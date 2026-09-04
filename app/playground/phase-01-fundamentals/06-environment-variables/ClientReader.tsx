'use client';

export default function ClientReader() {
  // These reads happen on the client. The bundler statically inlines
  // NEXT_PUBLIC_ values at build time; anything else was never included
  // in this file's compiled output at all.
  const publicValue = process.env.NEXT_PUBLIC_DEMO_MESSAGE;
  const serverValue = process.env.DEMO_SERVER_SECRET;

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 8 }}>
      <p>
        <strong>NEXT_PUBLIC_DEMO_MESSAGE</strong> (read in a Client Component): {publicValue ?? '(undefined)'}
      </p>
      <p>
        <strong>DEMO_SERVER_SECRET</strong> (read in a Client Component): {serverValue ?? '(undefined)'}
      </p>
    </div>
  );
}
