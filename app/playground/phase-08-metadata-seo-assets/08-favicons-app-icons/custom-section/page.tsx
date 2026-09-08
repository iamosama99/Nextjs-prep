export default function CustomSectionPage() {
  return (
    <div>
      <h1>Custom Section Icon</h1>
      <p>
        This segment has its own <code>icon.tsx</code> (yellow &quot;S&quot;), overriding the root{" "}
        <code>app/icon.tsx</code> (black &quot;N&quot;) for every page under this folder. View source —
        the <code>rel=&quot;icon&quot;</code> tag here should point at this segment&apos;s own generated
        icon, not the root one.
      </p>
    </div>
  );
}
