export default async function OptionalCatchAll(
  props: PageProps<'/playground/phase-02-app-router/06-catch-all-segments/optional/[[...slug]]'>
) {
  const { slug } = await props.params;

  return (
    <div>
      <h1>Optional catch-all matched</h1>
      <p>
        <code>params.slug</code> is: {slug && slug.length > 0 ? JSON.stringify(slug) : '(empty — zero segments, and it still matched)'}
      </p>
    </div>
  );
}
