export default function GenerateMetadataIndexPage() {
  return (
    <div>
      <h1>generateMetadata</h1>
      <p>
        Click a product above — each one&apos;s <code>&lt;title&gt;</code>/<code>description</code> is
        fetched inside <code>generateMetadata</code>, not hardcoded. View source (or{" "}
        <code>curl</code>) to see the resolved tags, and check the dev server console for the
        <code>[getProduct]</code> log — it should print once per navigation, not twice, despite being
        called from both <code>generateMetadata</code> and the page component.
      </p>
    </div>
  );
}
