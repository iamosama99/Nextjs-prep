import type { MetadataRoute } from "next";

// `lastModified: new Date()` matches the docs' own idiomatic example, but calling `new Date()`
// at render time is a non-deterministic call — Cache Components treats it the same way it treats
// Math.random() (Phase 3), which forces this whole route dynamic (ƒ, not ○), verified via a real
// `npm run build`. Swapping to a deterministic value (a literal date string) flips it back to ○ —
// also verified directly. See notes/phase-08-metadata-seo-assets/04-sitemap-robots for both.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "http://localhost:3000", lastModified: new Date(), changeFrequency: "yearly", priority: 1 },
    {
      url: "http://localhost:3000/playground",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
