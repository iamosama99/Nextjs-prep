import Link from 'next/link';

const demos = [
  {
    phase: 'Phase 1 — Fundamentals',
    items: [
      { href: '/playground/phase-01-fundamentals/04-next-config-essentials', label: '04. next.config.ts — redirects & rewrites' },
      { href: '/playground/phase-01-fundamentals/06-environment-variables', label: '06. Environment variables — public vs. server-only' },
      { href: '/playground/phase-01-fundamentals/07-static-assets-public-folder', label: '07. Static assets & the public folder' },
    ],
  },
  {
    phase: 'Phase 2 — App Router',
    items: [
      { href: '/playground/phase-02-app-router/01-file-based-routing', label: '01. File-based routing fundamentals' },
      { href: '/playground/phase-02-app-router/02-nested-layouts', label: '02. Root layout & nested layouts' },
      { href: '/playground/phase-02-app-router/03-templates-vs-layouts', label: '03. Templates vs layouts' },
      { href: '/playground/phase-02-app-router/04-route-groups', label: '04. Route groups' },
      { href: '/playground/phase-02-app-router/05-dynamic-segments', label: '05. Dynamic segments' },
      { href: '/playground/phase-02-app-router/06-catch-all-segments', label: '06. Catch-all & optional catch-all segments' },
      { href: '/playground/phase-02-app-router/07-parallel-routes', label: '07. Parallel routes' },
      { href: '/playground/phase-02-app-router/08-intercepting-routes', label: '08. Intercepting routes' },
      { href: '/playground/phase-02-app-router/09-loading-ui', label: '09. loading.tsx & instant loading states' },
      { href: '/playground/phase-02-app-router/10-error-boundaries', label: '10. error.tsx & error boundaries' },
      { href: '/playground/phase-02-app-router/11-not-found', label: '11. not-found.tsx & notFound()' },
      { href: '/playground/phase-02-app-router/12-linking-and-navigating', label: '12. Linking & navigating' },
    ],
  },
];

export default function PlaygroundIndex() {
  return (
    <div>
      <h1>Next.js Interview Prep — Playground</h1>
      <p>Live, hands-on demos for the topics in <code>notes/</code>. Read the topic&apos;s notes first, then click through here.</p>
      {demos.map((group) => (
        <section key={group.phase} style={{ marginTop: 24 }}>
          <h2>{group.phase}</h2>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
