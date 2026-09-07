import { Suspense } from 'react';

export default function PhotoPage(
  props: PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>
) {
  return (
    <div style={{ border: '2px solid #0070f3', padding: 24, marginTop: 16 }}>
      <Suspense fallback={<h2>Loading photo...</h2>}>
        <PhotoDetails params={props.params} />
      </Suspense>
    </div>
  );
}

async function PhotoDetails({
  params,
}: Pick<PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>, 'params'>) {
  const { id } = await params;

  return (
    <>
      <h2>Photo {id} — full standalone page</h2>
      <p>
        You reached this by a hard navigation (refresh, direct URL, or a new tab) — no modal, no gallery
        underneath. This is the real, shareable, refresh-safe route.
      </p>
    </>
  );
}
