export default function NoTitlePage() {
  return (
    <div>
      <h1>No Title Export</h1>
      <p>
        This page exports no <code>metadata</code> at all. Its <code>&lt;title&gt;</code> should fall
        back to the layout&apos;s <code>title.default</code> (&quot;Static Metadata Demo&quot;) —{" "}
        <em>not</em> run through <code>title.template</code>, since the template only augments a{" "}
        <code>title</code> a child segment actually sets.
      </p>
    </div>
  );
}
