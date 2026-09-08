import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { getAllProductIds, getProduct } from "../data";

export function generateStaticParams() {
  return getAllProductIds().map((id) => ({ id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  // Extend (not replace) the layout's openGraph.images, per the docs' recommended pattern.
  const previousImages = (await parent).openGraph?.images ?? [];

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [`/og/product-${id}.png`, ...previousImages],
    },
  };
}

// Pushing the `params` await into a Suspense-wrapped child (not awaiting at the top of the page)
// keeps this page's App Shell reusable for any product id, listed or not — same pattern Phase 3
// Topic 8 established for generateStaticParams; Cache Components enforces it with a real build
// error otherwise, verified directly (see the notes for the exact message).
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Loading product…</p>}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) return <p>Not found.</p>;

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>
        <code>getProduct(&apos;{id}&apos;)</code> ran once here and once inside{" "}
        <code>generateMetadata</code> above — React&apos;s <code>cache()</code> collapsed both into a
        single call for this request. Check the dev server console: only one log line per navigation.
      </p>
    </div>
  );
}
