import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Section Home",
};

export default function SectionHomePage() {
  return (
    <div>
      <h1>Section Home</h1>
      <p>
        Same route segment as <code>section/layout.tsx</code>, which defines{" "}
        <code>title.template: &apos;%s | Section&apos;</code>. Per the same-segment rule (Topic 1),
        that template does <em>not</em> apply here — but the root layout&apos;s template, two levels
        up, does: verified rendered title is <code>Section Home | Site</code>, not{" "}
        <code>Section Home</code> and not <code>Section Home | Section</code>. &quot;Closest
        template&quot; skips the same-segment layout and reaches the next real ancestor.
      </p>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/03-metadata-inheritance/section/deep">
          A genuine child of this section (template should apply there)
        </a>
      </p>
    </div>
  );
}
