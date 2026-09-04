import Link from 'next/link';

export default function NotFoundIndex() {
  return (
    <div>
      <h1>not-found.tsx & notFound()</h1>
      <ul>
        <li><Link href="/playground/phase-02-app-router/11-not-found/1">/1 (exists)</Link></li>
        <li><Link href="/playground/phase-02-app-router/11-not-found/999">/999 (does not exist — calls notFound())</Link></li>
      </ul>
    </div>
  );
}
