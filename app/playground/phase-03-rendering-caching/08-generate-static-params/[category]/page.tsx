import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';

export async function generateStaticParams() {
  return [{ category: 'fiction' }, { category: 'nonfiction' }];
}

async function getCategoryInfo(category: string) {
  'use cache';
  cacheLife('max');
  cacheTag(`category-${category}`);
  // crypto.randomUUID() here is captured ONCE, at cache-fill time — build time
  // for listed categories, first-visit time for unlisted ones (Topic 9).
  return { category, id: crypto.randomUUID() };
}

export default function CategoryPage(
  props: PageProps<'/playground/phase-03-rendering-caching/08-generate-static-params/[category]'>
) {
  return (
    <div>
      <p>
        <Link href="/playground/phase-03-rendering-caching/08-generate-static-params">
          &larr; Back to category list
        </Link>
      </p>
      {/* params isn't awaited here — pushed down into a Suspense-wrapped child
          so unlisted categories can still get an App Shell (Topic 1, Topic 9) */}
      <Suspense fallback={<p>Loading category...</p>}>
        <CategoryDetails params={props.params} />
      </Suspense>
    </div>
  );
}

async function CategoryDetails({
  params,
}: Pick<
  PageProps<'/playground/phase-03-rendering-caching/08-generate-static-params/[category]'>,
  'params'
>) {
  const { category } = await params;
  const info = await getCategoryInfo(category);
  return (
    <>
      <h1>Category: {info.category}</h1>
      <p>Cached id (stable across visits once generated): <strong>{info.id}</strong></p>
    </>
  );
}
