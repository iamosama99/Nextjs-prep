'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ border: '2px solid #dc2626', padding: 16 }}>
      <h2>Caught by error.tsx</h2>
      <p>error.message: {error.message}</p>
      <p>error.digest: {error.digest ?? '(none in dev mode)'}</p>
      <button onClick={() => reset()}>Reset (retry rendering the segment)</button>
    </div>
  );
}
