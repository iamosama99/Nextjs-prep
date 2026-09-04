'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function NavDemo() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
      <p>usePathname(): {pathname}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => router.push('/playground/phase-02-app-router/12-linking-and-navigating/target')}>
          router.push (adds history entry)
        </button>
        <button onClick={() => router.replace('/playground/phase-02-app-router/12-linking-and-navigating/target')}>
          router.replace (no history entry)
        </button>
        <button onClick={() => router.refresh()}>router.refresh (re-fetch, no navigation)</button>
      </div>
    </div>
  );
}
