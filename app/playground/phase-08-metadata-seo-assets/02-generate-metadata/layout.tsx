import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Generated Metadata Demo",
    default: "Generated Metadata Demo",
  },
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    images: ["/og/base-image.png"],
  },
};

export default function GenerateMetadataLayout({
  children,
}: LayoutProps<"/playground/phase-08-metadata-seo-assets/02-generate-metadata">) {
  return (
    <div>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/02-generate-metadata/products/1">
          Product 1
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/02-generate-metadata/products/2">
          Product 2
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/02-generate-metadata/personalized">
          Personalized (runtime data)
        </a>
      </p>
      {children}
    </div>
  );
}
