import Link from 'next/link';

export default function DynamicSegmentsIndex() {
  return (
    <div>
      <h1>Dynamic segments</h1>
      <p>Click any of these — each one is captured by the same <code>[slug]/page.tsx</code> file.</p>
      <ul>
        <li><Link href="/playground/phase-02-app-router/05-dynamic-segments/hello-world">hello-world</Link></li>
        <li><Link href="/playground/phase-02-app-router/05-dynamic-segments/my-first-post">my-first-post</Link></li>
      </ul>
    </div>
  );
}
