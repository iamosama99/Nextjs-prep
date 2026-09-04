'use client';

import { useRouter } from 'next/navigation';

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 280 }}>
        {children}
        <button onClick={() => router.back()} style={{ marginTop: 12 }}>
          Close (router.back())
        </button>
      </div>
    </div>
  );
}
