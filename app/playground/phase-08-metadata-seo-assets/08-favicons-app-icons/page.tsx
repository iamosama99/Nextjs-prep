export default function FaviconsAppIconsIndexPage() {
  return (
    <div>
      <h1>Favicons &amp; App Icon Conventions</h1>
      <p>
        The root <code>app/icon.tsx</code> and <code>app/apple-icon.tsx</code> apply site-wide — view
        source on any page outside this folder&apos;s subtree to see them. This folder demonstrates two
        more specific cases:
      </p>
      <ul>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/08-favicons-app-icons/custom-section">
            A segment with its own icon.tsx, overriding the root
          </a>
        </li>
        <li>
          <a href="/playground/phase-08-metadata-seo-assets/08-favicons-app-icons/multiple-icons">
            Multiple numbered icons (icon1.tsx, icon2.tsx) in one segment
          </a>
        </li>
      </ul>
    </div>
  );
}
