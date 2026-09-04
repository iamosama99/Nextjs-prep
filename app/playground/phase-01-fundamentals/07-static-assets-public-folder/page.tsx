export default function PublicFolderDemo() {
  return (
    <div>
      <h1>Static assets &amp; the public folder</h1>
      <p>
        This image lives at <code>public/playground-demo.svg</code> and is referenced below with a plain string
        path — <code>/playground-demo.svg</code> — no import statement, no bundler processing.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- intentionally plain <img>, this topic is about public/ bypassing next/image's pipeline */}
      <img src="/playground-demo.svg" alt="Blue rectangle reading 'public/ asset'" width={200} height={120} />
      <p style={{ marginTop: 12 }}>
        Try requesting <code>/playground-demo.svg</code> directly in a new tab — it&apos;s served exactly as-is,
        at the exact path <code>public/</code> mirrors, with no content hash appended to the filename.
      </p>
    </div>
  );
}
