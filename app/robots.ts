import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/", disallow: "/playground/phase-08-metadata-seo-assets/04-sitemap-robots/private/" },
      { userAgent: "*", disallow: "/playground/phase-08-metadata-seo-assets/04-sitemap-robots/private/" },
      {
        userAgent: "SeznamBot",
        allow: "/",
        other: { "Request-Rate": "10/1m" },
      },
    ],
    sitemap: "http://localhost:3000/sitemap.xml",
  };
}
