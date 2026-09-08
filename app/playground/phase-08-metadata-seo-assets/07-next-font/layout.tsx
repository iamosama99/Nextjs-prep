import { inter, robotoMono } from "./fonts";

export default function NextFontLayout({
  children,
}: LayoutProps<"/playground/phase-08-metadata-seo-assets/07-next-font">) {
  return (
    <div className={`${inter.variable} ${robotoMono.variable}`}>{children}</div>
  );
}
