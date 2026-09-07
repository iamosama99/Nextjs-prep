import { Suspense } from 'react';

export default function RequiredCatchAll(
  props: PageProps<'/playground/phase-02-app-router/06-catch-all-segments/required/[...slug]'>
) {
  return (
    <div>
      <h1>Required catch-all matched</h1>
      <Suspense fallback={<p>Resolving params.slug...</p>}>
        <SlugValue params={props.params} />
      </Suspense>
    </div>
  );
}

async function SlugValue({
  params,
}: Pick<PageProps<'/playground/phase-02-app-router/06-catch-all-segments/required/[...slug]'>, 'params'>) {
  const { slug } = await params;
  return <p><code>params.slug</code> is an array: {JSON.stringify(slug)}</p>;
}
