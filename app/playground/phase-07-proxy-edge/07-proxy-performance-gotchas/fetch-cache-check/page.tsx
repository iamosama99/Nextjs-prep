export default function FetchCacheCheckPage() {
  return (
    <div>
      <h1>fetch() Cache Options in Proxy</h1>
      <p>
        Proxy fetches <code>/api/uuid</code> with <code>next: {'{'} revalidate: 60 {'}'}</code> on every
        request to this page. `curl -i` this page twice in a row and compare the{' '}
        <code>x-fetched-uuid</code> response header — the docs say cache options have no effect in Proxy;
        this checks that directly.
      </p>
    </div>
  );
}
