import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deep Page",
};

export default function DeepPage() {
  return (
    <div>
      <h1>Deep Page</h1>
      <p>
        A genuine child segment of <code>section/layout.tsx</code>, so its{" "}
        <code>title.template</code> (&apos;%s | Section&apos;) should apply here — expect{" "}
        <code>Deep Page | Section</code>, not <code>Deep Page | Site</code>. The root layout&apos;s
        template two levels up is not involved: only the <em>closest</em> ancestor&apos;s template
        applies, templates don&apos;t stack across multiple levels.
      </p>
    </div>
  );
}
