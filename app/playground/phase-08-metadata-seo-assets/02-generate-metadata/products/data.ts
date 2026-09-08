import { cache } from "react";

type Product = { id: string; title: string; description: string };

const PRODUCTS: Record<string, Product> = {
  "1": { id: "1", title: "Mechanical Keyboard", description: "A loud, clicky keyboard." },
  "2": { id: "2", title: "Standing Desk", description: "A desk that goes up and down." },
};

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// getProduct is called once from generateMetadata and once from the page component,
// but React's cache() collapses both calls into a single execution per request.
export const getProduct = cache(async (id: string): Promise<Product | undefined> => {
  console.log(`[getProduct] fetching id=${id}`);
  return delay(50, PRODUCTS[id]);
});

export function getAllProductIds(): string[] {
  return Object.keys(PRODUCTS);
}
