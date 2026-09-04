'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SearchParamsDemo() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
      <p>useSearchParams().get(&apos;q&apos;): {q ?? '(none)'}</p>
      <Link href="/playground/phase-02-app-router/12-linking-and-navigating?q=hello">Set ?q=hello</Link>
    </div>
  );
}
