import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables Cache Components (the `use cache` directive, cacheLife/cacheTag, and
  // Partial Prerendering as the default rendering model) for Phase 3 onward.
  // See notes/phase-03-rendering-caching/01-rendering-as-a-spectrum/notes.md.
  cacheComponents: true,
  // Demo remote pattern for notes/phase-08-metadata-seo-assets/06-next-image-deep-dive —
  // next/image refuses to optimize a remote src unless its host is explicitly allow-listed here.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Demo rules for notes/phase-01-fundamentals/04-next-config-essentials.
  // Evaluated once at build/startup, not per request (see the notes for why that matters).
  async redirects() {
    return [
      {
        source: "/playground/phase-01-fundamentals/04-next-config-essentials/old-page",
        destination: "/playground/phase-01-fundamentals/04-next-config-essentials/new-page",
        permanent: false, // 307 — flip to true for a 308 and feel the SEO-weight difference
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/playground/phase-01-fundamentals/04-next-config-essentials/proxy-demo",
        destination: "/playground/phase-01-fundamentals/04-next-config-essentials/internal-content",
      },
    ];
  },
};

export default nextConfig;
