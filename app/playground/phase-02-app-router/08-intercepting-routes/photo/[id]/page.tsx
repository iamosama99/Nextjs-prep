export default async function PhotoPage(
  props: PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>
) {
  const { id } = await props.params;

  return (
    <div style={{ border: '2px solid #0070f3', padding: 24, marginTop: 16 }}>
      <h2>Photo {id} — full standalone page</h2>
      <p>
        You reached this by a hard navigation (refresh, direct URL, or a new tab) — no modal, no gallery
        underneath. This is the real, shareable, refresh-safe route.
      </p>
    </div>
  );
}
