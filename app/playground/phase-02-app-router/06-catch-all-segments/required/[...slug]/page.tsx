export default async function RequiredCatchAll(
  props: PageProps<'/playground/phase-02-app-router/06-catch-all-segments/required/[...slug]'>
) {
  const { slug } = await props.params;

  return (
    <div>
      <h1>Required catch-all matched</h1>
      <p><code>params.slug</code> is an array: {JSON.stringify(slug)}</p>
    </div>
  );
}
