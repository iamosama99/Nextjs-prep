import type { Metadata } from "next";
import { sharedOgImage } from "./shared-og";

export const metadata: Metadata = {
  title: {
    template: "%s | Site",
    default: "Site",
  },
  metadataBase: new URL("http://localhost:3000"),
  description: "Site-wide description, set once at the top of this topic's tree.",
  openGraph: {
    title: "Site",
    description: "Site-wide OG description.",
    ...sharedOgImage,
  },
};

export default function InheritanceRootLayout({
  children,
}: LayoutProps<"/playground/phase-08-metadata-seo-assets/03-metadata-inheritance">) {
  return (
    <div>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance">Overview</a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/other-branch">
          Other branch (no title)
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/section">
          Section (own template)
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/section/no-title">
          Section / no title
        </a>
        {" · "}
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/section/shared-image">
          Section / shared image
        </a>
      </p>
      {children}
    </div>
  );
}
