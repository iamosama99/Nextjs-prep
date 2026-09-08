import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templated Child",
};

export default function TemplatedChildPage() {
  return (
    <div>
      <h1>Templated Child</h1>
      <p>
        Unlike the overview page (same segment as the layout that defines <code>title.template</code>),
        this page is a genuine <em>child</em> segment of that layout, so the template applies —{" "}
        <code>&lt;title&gt;</code> should render as{" "}
        <code>Templated Child | Static Metadata Demo</code>.
      </p>
    </div>
  );
}
