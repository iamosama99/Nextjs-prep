export default function ActualContentPage() {
  return (
    <div>
      <h1>Actual Content</h1>
      <p>
        If you arrived here by visiting <code>.../rewrite-me</code>, your URL bar still shows{' '}
        <code>rewrite-me</code> — that&apos;s a rewrite, not a redirect. This page has no way of knowing
        it was reached that way; proxy transparently served this content instead.
      </p>
    </div>
  );
}
