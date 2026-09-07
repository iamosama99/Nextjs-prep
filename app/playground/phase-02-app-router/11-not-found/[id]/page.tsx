import { Suspense } from 'react';
import { notFound } from 'next/navigation';

const knownIds = new Set(['1', '2', '3']);

export default function ItemPage(
  props: PageProps<'/playground/phase-02-app-router/11-not-found/[id]'>
) {
  return (
    <Suspense fallback={<p>Looking up item...</p>}>
      <ItemLookup params={props.params} />
    </Suspense>
  );
}

async function ItemLookup({
  params,
}: Pick<PageProps<'/playground/phase-02-app-router/11-not-found/[id]'>, 'params'>) {
  const { id } = await params;

  if (!knownIds.has(id)) {
    notFound(); // throws internally -- nothing after this line runs
  }

  return <p>Item {id} found.</p>;
}
