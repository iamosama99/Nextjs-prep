import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview",
};

export default function StaticMetadataOverviewPage() {
  return (
    <div>
      <h1>Static Metadata — Overview</h1>
      <p>
        This page sets <code>title: &apos;Overview&apos;</code> — but its <code>&lt;title&gt;</code>{" "}
        renders as exactly <code>Overview</code>, <em>not</em> <code>Overview | Static Metadata Demo</code>.
        That&apos;s not a bug: this <code>page.tsx</code> shares the same route segment as the{" "}
        <code>layout.tsx</code> that defines <code>title.template</code>, and a template only augments
        titles from <em>child</em> segments. See the <a href="./templated-child">Templated Child</a>{" "}
        page for the template actually applying.
      </p>
      <p>
        This page defines no <code>openGraph</code> or <code>description</code> of its own, so those
        fields are fully inherited from the layout — inspect the page source and look for the{" "}
        <code>og:description</code> meta tag to confirm.
      </p>
    </div>
  );
}
