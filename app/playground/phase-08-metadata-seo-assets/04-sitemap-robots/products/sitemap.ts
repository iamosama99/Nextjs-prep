import type { MetadataRoute } from "next";
import { ALL_PRODUCTS, CHUNK_SIZE } from "./data";

export async function generateSitemaps() {
  const chunkCount = Math.ceil(ALL_PRODUCTS.length / CHUNK_SIZE);
  return Array.from({ length: chunkCount }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const resolvedId = await id;
  // v16: `id` arrives as a string, not a number — logged to confirm, since a naive
  // `Number(id) * CHUNK_SIZE` would silently do the wrong thing if it were, say, "1" + "1".
  console.log(`[products/sitemap] id=${JSON.stringify(resolvedId)} typeof=${typeof resolvedId}`);

  const start = Number(resolvedId) * CHUNK_SIZE;
  const chunk = ALL_PRODUCTS.slice(start, start + CHUNK_SIZE);

  return chunk.map((product) => ({
    url: `http://localhost:3000/playground/phase-08-metadata-seo-assets/04-sitemap-robots/products/${product.id}`,
    lastModified: product.updatedAt,
  }));
}
