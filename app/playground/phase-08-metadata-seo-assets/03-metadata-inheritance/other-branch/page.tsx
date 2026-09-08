export default function OtherBranchPage() {
  return (
    <div>
      <h1>Other Branch — No Title</h1>
      <p>
        A sibling of <code>section/</code>, not a descendant of it. This page sets no title, so it
        should inherit the root layout&apos;s <code>title.default</code> (&quot;Site&quot;) — proving
        each branch of the tree resolves inheritance independently, based on its own ancestor chain,
        not on what some other branch (like <code>section/</code>) happens to define.
      </p>
    </div>
  );
}
