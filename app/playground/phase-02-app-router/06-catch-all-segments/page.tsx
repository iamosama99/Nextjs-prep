import Link from 'next/link';

export default function CatchAllIndex() {
  return (
    <div>
      <h1>Catch-all & optional catch-all segments</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Required: [...slug]</h2>
        <ul>
          <li><Link href="/playground/phase-02-app-router/06-catch-all-segments/required">/required (expect a 404 — needs at least one segment)</Link></li>
          <li><Link href="/playground/phase-02-app-router/06-catch-all-segments/required/a">/required/a</Link></li>
          <li><Link href="/playground/phase-02-app-router/06-catch-all-segments/required/a/b/c">/required/a/b/c</Link></li>
        </ul>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Optional: [[...slug]]</h2>
        <ul>
          <li><Link href="/playground/phase-02-app-router/06-catch-all-segments/optional">/optional (matches with zero segments too)</Link></li>
          <li><Link href="/playground/phase-02-app-router/06-catch-all-segments/optional/a/b">/optional/a/b</Link></li>
        </ul>
      </section>
    </div>
  );
}
