import Image from "next/image";

export default function FillSizesPage() {
  return (
    <div>
      <h1>fill + sizes</h1>
      <p>
        The container below is <code>position: relative</code> with a fixed height — the image has no{" "}
        <code>width</code>/<code>height</code> of its own and instead uses <code>fill</code> plus{" "}
        <code>sizes</code> to describe how much of the viewport it occupies at each breakpoint.
      </p>
      <div style={{ position: "relative", width: "100%", height: 300 }}>
        <Image
          src="https://fastly.picsum.photos/id/162/800/600.jpg"
          alt="A remote photo, filling its container"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
