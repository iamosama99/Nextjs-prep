export default function DynamicRouteHandlersPage() {
  return (
    <div>
      <h1>Dynamic Route Handlers &amp; Params</h1>
      <p>Curl these — they aren&apos;t clickable UI:</p>
      <ul>
        <li><code>.../api/items/anything</code> — single dynamic segment.</li>
        <li><code>.../api/shop/electronics/laptop</code> — two dynamic segments.</li>
        <li><code>.../api/blog/2024/09/my-post</code> — catch-all, resolves to an array.</li>
        <li>
          <code>.../api/posts/1</code>, <code>.../api/posts/2</code>, <code>.../api/posts/3</code> —
          statically generated at build time via <code>generateStaticParams</code>; try{' '}
          <code>.../api/posts/999</code> too — still works, just rendered on demand instead.
        </li>
      </ul>
    </div>
  );
}
