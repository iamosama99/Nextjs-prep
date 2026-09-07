import { Suspense } from 'react';

export default function OptionalCatchAll(
  props: PageProps<'/playground/phase-02-app-router/06-catch-all-segments/optional/[[...slug]]'>
) {
  return (
    <div>
      <h1>Optional catch-all matched</h1>
      <Suspense fallback={<p>Resolving params.slug...</p>}>
        <SlugValue params={props.params} />
      </Suspense>
    </div>
  );
}

async function SlugValue({
  params,
}: Pick<PageProps<'/playground/phase-02-app-router/06-catch-all-segments/optional/[[...slug]]'>, 'params'>) {
  const { slug } = await params;
  return (
    <p>
      <code>params.slug</code> is: {slug && slug.length > 0 ? JSON.stringify(slug) : '(empty — zero segments, and it still matched)'}
    </p>
  );
}
