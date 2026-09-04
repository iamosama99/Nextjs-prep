import { Suspense } from 'react';
import Link from 'next/link';
import NavDemo from './NavDemo';
import SearchParamsDemo from './SearchParamsDemo';

export default function LinkingDemo() {
  return (
    <div>
      <h1>Linking & navigating</h1>
      <p>
        <Link href="/playground/phase-02-app-router/12-linking-and-navigating/target">
          Plain Link to /target (prefetched automatically)
        </Link>
      </p>
      <NavDemo />
      <Suspense fallback={<p>Loading search params...</p>}>
        <SearchParamsDemo />
      </Suspense>
    </div>
  );
}
