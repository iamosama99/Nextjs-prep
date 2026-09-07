import Link from 'next/link';
import Counter from '../Counter';

export default function PageB() {
  return (
    <div>
      <h1>Page B</h1>
      <p>
        <Link href="/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity/page-a">
          &larr; Back to Page A
        </Link>
      </p>
      <Counter label="Page B" />
    </div>
  );
}
