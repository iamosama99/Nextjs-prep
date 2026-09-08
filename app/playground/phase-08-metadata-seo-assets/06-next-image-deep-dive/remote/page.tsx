import Image from "next/image";

export default function RemoteImagePage() {
  return (
    <div>
      <h1>Remote Image</h1>
      <p>
        <code>src</code> points at <code>fastly.picsum.photos</code>, allow-listed in{" "}
        <code>next.config.ts</code>&apos;s <code>images.remotePatterns</code>. Next.js can&apos;t read
        this file during the build, so <code>width</code>/<code>height</code> are supplied manually.
      </p>
      <Image
        src="https://fastly.picsum.photos/id/162/800/600.jpg"
        alt="A remote photo served through next/image"
        width={800}
        height={600}
      />
    </div>
  );
}
