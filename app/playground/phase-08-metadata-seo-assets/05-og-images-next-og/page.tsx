export default function OgImagesIndexPage() {
  return (
    <div>
      <h1>next/og — ImageResponse</h1>
      <p>
        This segment has both an <code>opengraph-image.tsx</code> and a{" "}
        <code>twitter-image.tsx</code>, colocated as siblings of this <code>page.tsx</code>. View
        source (or <code>curl</code>) to see the auto-generated <code>og:image</code>/
        <code>twitter:image</code> tags, and visit the generated image URLs directly to see the actual
        PNG.
      </p>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/05-og-images-next-og/opengraph-image">
          View the generated opengraph-image directly
        </a>
      </p>
      <p>
        <a href="/playground/phase-08-metadata-seo-assets/05-og-images-next-og/hello-world">
          Dynamic per-slug image (params-driven)
        </a>
      </p>
    </div>
  );
}
