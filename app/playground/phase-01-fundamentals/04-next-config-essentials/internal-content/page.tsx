export default function InternalContent() {
  return (
    <div>
      <h1>This is the internal-content page</h1>
      <p>
        But look at your URL bar — it still says <code>/proxy-demo</code>. The rewrite in{' '}
        <code>next.config.ts</code> served this page&apos;s content transparently, without your browser ever
        knowing it navigated anywhere else.
      </p>
    </div>
  );
}
