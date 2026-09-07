import { Suspense } from 'react';

export default function SlugPage(props: PageProps<'/playground/phase-02-app-router/05-dynamic-segments/[slug]'>) {
  return (
    <div>
      <h1>Dynamic segment captured</h1>
      {/* params isn't known until request time here (no generateStaticParams), so
          Cache Components requires the access behind Suspense to keep the rest
          of the page in the static shell — see phase-03-rendering-caching. */}
      <Suspense fallback={<p><code>params.slug</code> resolving...</p>}>
        <SlugValue params={props.params} />
      </Suspense>
    </div>
  );
}

async function SlugValue({ params }: Pick<PageProps<'/playground/phase-02-app-router/05-dynamic-segments/[slug]'>, 'params'>) {
  const { slug } = await params;

  return (
    <p>
      <code>params.slug</code> resolved to: <strong>{slug}</strong>
      <br />
      Typed via the generated <code>PageProps</code> helper — no manual <code>Promise&lt;{'{'}slug: string{'}'}&gt;</code> typing needed.
    </p>
  );
}
