import Link from 'next/link';
import Counter from './Counter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1>Root layout & nested layouts</h1>
      <Counter />
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link href="/playground/phase-02-app-router/02-nested-layouts/settings">Settings</Link>
        <Link href="/playground/phase-02-app-router/02-nested-layouts/billing">Billing</Link>
      </nav>
      {children}
    </div>
  );
}
