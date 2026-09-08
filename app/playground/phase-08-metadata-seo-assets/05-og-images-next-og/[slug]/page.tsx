import { Suspense } from "react";

export default function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <SlugContent params={params} />
    </Suspense>
  );
}

async function SlugContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Slug: {slug}</h1>
      <p>
        This route&apos;s <code>opengraph-image.tsx</code> reads the same <code>params</code>, unguarded
        by any <code>&lt;Suspense&gt;</code> — since an image route can&apos;t wrap its own body in
        JSX Suspense the way this page can. Check the notes for what that means under Cache Components.
      </p>
    </div>
  );
}
