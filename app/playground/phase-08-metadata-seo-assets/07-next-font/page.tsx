import { inter } from "./fonts";

export default function NextFontPage() {
  return (
    <div>
      <h1>next/font</h1>
      <p className={inter.className}>
        This paragraph uses <code>inter.className</code> directly — a Google Font, self-hosted. View
        source: the actual <code>@font-face</code> <code>src</code> should point at{" "}
        <code>/_next/static/media/...woff2</code>, never <code>fonts.googleapis.com</code> or{" "}
        <code>fonts.gstatic.com</code>.
      </p>
      <p style={{ fontFamily: "var(--font-roboto-mono)" }}>
        This paragraph uses the <code>--font-roboto-mono</code> CSS variable instead — a local{" "}
        <code>.woff2</code> file loaded via <code>next/font/local</code>, exposed as a variable on the
        layout&apos;s wrapper <code>div</code> rather than applied via <code>className</code> directly
        here.
      </p>
    </div>
  );
}
