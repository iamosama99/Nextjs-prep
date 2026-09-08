export const ALL_PRODUCTS = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  updatedAt: new Date(`2024-01-0${i + 1}`),
}));

export const CHUNK_SIZE = 2;
