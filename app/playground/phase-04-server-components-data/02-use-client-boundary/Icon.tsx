// No 'use client' directive here — and none needed. Being imported by
// Panel.tsx (a 'use client' entry point) is enough to pull this into the
// client bundle. It happens to render fine on the server too, since it does
// nothing client-only — but it's still compiled as part of the client graph.
export default function Icon() {
  return <span aria-hidden>⭐</span>;
}
