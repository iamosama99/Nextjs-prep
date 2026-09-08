import type { Metadata } from "next";
import { sharedOgImage } from "../../shared-og";

export const metadata: Metadata = {
  title: "Shared Image",
  openGraph: {
    ...sharedOgImage,
    title: "Shared Image — Section",
  },
};

export default function SharedImagePage() {
  return (
    <div>
      <h1>Shared Image</h1>
      <p>
        This page redefines <code>openGraph</code> (so it doesn&apos;t just inherit the root&apos;s
        untouched), but explicitly spreads the same <code>sharedOgImage</code> constant the root layout
        used — the docs&apos; own technique for sharing one nested field across segments while
        overriding others. Expect the same <code>og:image</code> URL as the root layout, but a
        section-specific <code>og:title</code>.
      </p>
    </div>
  );
}
