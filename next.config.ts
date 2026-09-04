import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
