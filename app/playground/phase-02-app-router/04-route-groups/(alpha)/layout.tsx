export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '3px solid #0070f3', padding: 12 }}>
      <p>This layout comes from the (alpha) route group.</p>
      {children}
    </div>
  );
}
