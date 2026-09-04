export default function NewPage() {
  return (
    <div>
      <h1>You were redirected here</h1>
      <p>
        The URL bar now shows <code>/new-page</code>. Your browser made a brand-new request — this is a real
        redirect (a 3xx response from the server), not a rewrite.
      </p>
    </div>
  );
}
