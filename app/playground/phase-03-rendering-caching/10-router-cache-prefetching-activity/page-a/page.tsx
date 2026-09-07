import Link from 'next/link';
import Counter from '../Counter';
import ResettingDropdown from '../ResettingDropdown';

export default function PageA() {
  return (
    <div>
      <h1>Page A</h1>
      <p>
        <Link href="/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity/page-b">
          Go to Page B &rarr;
        </Link>
      </p>
      <Counter label="Page A" />
      <ResettingDropdown />
    </div>
  );
}
