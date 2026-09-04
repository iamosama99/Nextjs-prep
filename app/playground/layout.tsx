import Link from 'next/link';

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <nav style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #ddd' }}>
        <Link href="/playground">&larr; Playground index</Link>
      </nav>
      {children}
    </div>
  );
}
