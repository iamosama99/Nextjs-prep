import Link from 'next/link';

export default function OtherPage() {
  return (
    <div>
      <h1>Sibling page</h1>
      <p>
        <Link href="/playground/phase-04-server-components-data/01-server-components-by-default">
          &larr; Back
        </Link>
      </p>
    </div>
  );
}
