export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '3px solid #22c55e', padding: 12 }}>
      <p>This layout comes from the (beta) route group.</p>
      {children}
    </div>
  );
}
