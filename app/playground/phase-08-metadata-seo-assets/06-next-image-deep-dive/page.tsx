export default function NextImageIndexPage() {
  return (
    <div>
      <h1>next/image Deep Dive</h1>
      <ul>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/06-next-image-deep-dive/local-static-import">
            Local, statically imported (auto width/height/blurDataURL)
          </a>
        </li>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/06-next-image-deep-dive/remote">
            Remote image (via remotePatterns)
          </a>
        </li>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/06-next-image-deep-dive/fill-sizes">
            fill + sizes
          </a>
        </li>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/06-next-image-deep-dive/preload-priority">
            preload vs. the deprecated priority prop
          </a>
        </li>
      </ul>
    </div>
  );
}
