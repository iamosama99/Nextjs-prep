import ThrowButton from './ThrowButton';

export default function ErrorBoundaryDemo() {
  return (
    <div>
      <h1>error.tsx & error boundaries</h1>
      <p>Click the button — it throws during render, and the nearest error.tsx boundary catches it.</p>
      <ThrowButton />
    </div>
  );
}
