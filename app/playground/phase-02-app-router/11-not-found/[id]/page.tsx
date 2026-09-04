import { notFound } from 'next/navigation';

const knownIds = new Set(['1', '2', '3']);

export default async function ItemPage(
  props: PageProps<'/playground/phase-02-app-router/11-not-found/[id]'>
) {
  const { id } = await props.params;

  if (!knownIds.has(id)) {
    notFound(); // throws internally -- nothing after this line runs
  }

  return <p>Item {id} found.</p>;
}
