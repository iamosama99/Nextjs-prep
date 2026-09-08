export default function SectionNoTitlePage() {
  return (
    <div>
      <h1>Section / No Title</h1>
      <p>
        No <code>metadata</code> export here, so the title falls back to{" "}
        <code>section/layout.tsx</code>&apos;s <code>title.default</code> (&quot;Section&quot;) — the
        closest ancestor that defines one. But verified rendered title is{" "}
        <code>Section | Site</code>, not bare <code>Section</code>: the docs are explicit that{" "}
        <code>title.default</code> itself &quot;augments <code>title.template</code> from the closest
        parent segment&quot; — here, the root layout&apos;s template, since a template never applies
        to the segment that defines it.
      </p>
    </div>
  );
}
