// Required for a named slot in Next.js 16 -- also what actually renders here on a hard
// reload of /team-settings, since @analytics has no route matching that URL.
export default function AnalyticsDefault() {
  return <p><strong>@analytics slot</strong> — default.tsx (this URL has no matching @analytics route).</p>;
}
