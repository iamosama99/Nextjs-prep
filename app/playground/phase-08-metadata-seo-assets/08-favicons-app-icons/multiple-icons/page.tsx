export default function MultipleIconsPage() {
  return (
    <div>
      <h1>Multiple Icons</h1>
      <p>
        This segment has no base <code>icon.tsx</code> — only <code>icon1.tsx</code> (16×16, red) and{" "}
        <code>icon2.tsx</code> (32×32, green). View source for two separate <code>rel=&quot;icon&quot;</code>{" "}
        tags, sorted lexically by filename.
      </p>
    </div>
  );
}
