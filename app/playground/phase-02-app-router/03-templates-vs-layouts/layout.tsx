import Link from 'next/link';
import StateBox from './StateBox';

export default function TemplatesDemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1>Templates vs layouts</h1>
      <p>Click both counters, then navigate between A/B and watch which one resets.</p>
      <StateBox label="Inside layout.tsx (persists)" />
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link href="/playground/phase-02-app-router/03-templates-vs-layouts/a">A</Link>
        <Link href="/playground/phase-02-app-router/03-templates-vs-layouts/b">B</Link>
      </nav>
      {children}
    </div>
  );
}
