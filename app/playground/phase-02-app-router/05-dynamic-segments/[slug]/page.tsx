export default async function SlugPage(props: PageProps<'/playground/phase-02-app-router/05-dynamic-segments/[slug]'>) {
  const { slug } = await props.params;

  return (
    <div>
      <h1>Dynamic segment captured</h1>
      <p>
        <code>params.slug</code> resolved to: <strong>{slug}</strong>
      </p>
      <p>Typed via the generated <code>PageProps</code> helper — no manual <code>Promise&lt;{'{'}slug: string{'}'}&gt;</code> typing needed.</p>
    </div>
  );
}
