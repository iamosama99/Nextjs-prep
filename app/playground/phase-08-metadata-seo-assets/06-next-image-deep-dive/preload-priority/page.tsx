import Image from "next/image";
import photo from "../local-photo.jpg";

export default function PreloadPriorityPage() {
  return (
    <div>
      <h1>preload vs. the deprecated priority prop</h1>
      <p>
        Next.js 16 deprecated <code>priority</code> in favor of <code>preload</code> — same LCP-hint
        idea, clearer name. Both are used below; check the dev server console for a real deprecation
        warning on the <code>priority</code> one, and view source for the <code>&lt;link
        rel=&quot;preload&quot;&gt;</code> tag the <code>preload</code> one injects into{" "}
        <code>&lt;head&gt;</code>.
      </p>
      <h2>Using preload (current)</h2>
      <Image src={photo} alt="Preloaded image" preload />
      <h2>Using priority (deprecated)</h2>
      <Image src={photo} alt="Priority image" priority />
    </div>
  );
}
