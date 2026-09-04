// This file is colocated in the same folder as page.tsx, but "Helper.tsx"
// is not a reserved filename -- the router never sees it, it's just a component.
export default function Helper() {
  return <p style={{ color: '#0070f3' }}>I am Helper.tsx, colocated next to page.tsx — not a route.</p>;
}
