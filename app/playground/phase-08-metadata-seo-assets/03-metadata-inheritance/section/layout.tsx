import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Section",
    default: "Section",
  },
};

export default function SectionLayout({
  children,
}: LayoutProps<"/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/section">) {
  return <div>{children}</div>;
}
