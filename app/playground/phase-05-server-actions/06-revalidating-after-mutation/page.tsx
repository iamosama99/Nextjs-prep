import { Suspense } from 'react';
import { io } from 'next/cache';
import { getHeadline } from './data';
import { readMutationCount } from './store';
import { mutateThenUpdateTag, mutateThenRevalidateTag, mutateThenRevalidatePath, mutateThenRefresh } from './actions';

export default function RevalidatingAfterMutationPage() {
  return (
    <div>
      <h1>Revalidating Data After a Mutation</h1>
      <p>
        Every button below bumps the same plain (uncached) counter, then touches the cached headline below
        it a different way. Click one at a time and watch <strong>both</strong> values. Three buttons
        invalidate the headline (its timestamp changes); one — <code>refresh</code> — deliberately leaves
        it exactly as it was, updating only the counter.
      </p>

      <section style={{ border: '1px solid #7928ca', padding: 12, marginTop: 16 }}>
        <Suspense fallback={<p>Loading...</p>}>
          <State />
        </Suspense>
      </section>

      <section style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <form action={mutateThenUpdateTag}>
          <button type="submit">updateTag (immediate, bundled re-render)</button>
        </form>
        <form action={mutateThenRevalidateTag}>
          <button type="submit">revalidateTag (stale-while-revalidate)</button>
        </form>
        <form action={mutateThenRevalidatePath}>
          <button type="submit">revalidatePath (immediate, bundled re-render)</button>
        </form>
        <form action={mutateThenRefresh}>
          <button type="submit">refresh (re-render only, cache untouched)</button>
        </form>
      </section>
    </div>
  );
}

async function State() {
  await io();
  const headline = await getHeadline();
  const mutationCount = readMutationCount();
  return (
    <ul>
      <li>
        Mutation count (uncached, read fresh every render): <strong>{mutationCount}</strong>
      </li>
      <li>
        Cached headline: <strong>{headline.text}</strong> (id: {headline.id.slice(0, 8)})
      </li>
    </ul>
  );
}
