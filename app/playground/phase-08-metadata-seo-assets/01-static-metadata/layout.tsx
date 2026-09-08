import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Static Metadata Demo",
    default: "Static Metadata Demo",
  },
  description: "Layout-level description, defined once for this whole subtree.",
  openGraph: {
    title: "Static Metadata Demo",
    description: "OG description set at the layout level.",
  },
};

export default function StaticMetadataLayout({
  children,
}: LayoutProps<"/playground/phase-08-metadata-seo-assets/01-static-metadata">) {
  return (
    <div>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/01-static-metadata">Overview</a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/01-static-metadata/no-title">No title (fallback)</a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/01-static-metadata/absolute-title">
          Absolute title
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/01-static-metadata/templated-child">
          Templated child
        </a>
      </p>
      {children}
    </div>
  );
}
