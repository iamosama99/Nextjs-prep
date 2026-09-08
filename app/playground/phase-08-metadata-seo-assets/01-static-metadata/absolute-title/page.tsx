import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Ignores The Template",
  },
};

export default function AbsoluteTitlePage() {
  return (
    <div>
      <h1>Absolute Title</h1>
      <p>
        This page sets <code>title: {"{"} absolute: &apos;Ignores The Template&apos; {"}"}</code>, which
        should render as exactly <code>Ignores The Template</code> — no{" "}
        <code> | Static Metadata Demo</code> suffix from the layout&apos;s template.
      </p>
    </div>
  );
}
