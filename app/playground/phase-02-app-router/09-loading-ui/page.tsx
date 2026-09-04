async function getSlowData() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return 'Data that took 2 seconds to fetch';
}

export default async function LoadingDemo() {
  const data = await getSlowData();

  return (
    <div>
      <h1>loading.tsx & instant loading states</h1>
      <p>
        This Server Component awaited an artificial 2-second delay before rendering. Refresh the page (or
        navigate here from the playground index) and you should see the loading.tsx fallback first.
      </p>
      <p style={{ border: '1px solid #ccc', padding: 12 }}>Resolved: {data}</p>
    </div>
  );
}
