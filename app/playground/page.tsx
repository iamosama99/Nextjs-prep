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
  {
    phase: 'Phase 3 — Rendering Model & Caching',
    items: [
      { href: '/playground/phase-03-rendering-caching/01-rendering-as-a-spectrum', label: '01. Static and dynamic as a spectrum' },
      { href: '/playground/phase-03-rendering-caching/02-suspense-dynamic-boundary', label: '02. <Suspense> as the dynamic boundary' },
      { href: '/playground/phase-03-rendering-caching/03-request-memoization', label: '03. Request Memoization' },
      { href: '/playground/phase-03-rendering-caching/04-react-cache-function', label: "04. React's cache() function" },
      { href: '/playground/phase-03-rendering-caching/05-use-cache-directive', label: '05. The "use cache" directive' },
      { href: '/playground/phase-03-rendering-caching/06-cachelife-time-based-revalidation', label: '06. cacheLife — time-based revalidation' },
      { href: '/playground/phase-03-rendering-caching/07-cachetag-on-demand-revalidation', label: '07. cacheTag, revalidateTag & updateTag' },
      { href: '/playground/phase-03-rendering-caching/08-generate-static-params', label: '08. generateStaticParams' },
      { href: '/playground/phase-03-rendering-caching/10-router-cache-prefetching-activity', label: '10. Router Cache, prefetching & <Activity>' },
    ],
  },
  {
    phase: 'Phase 4 — Server Components & Data Fetching',
    items: [
      { href: '/playground/phase-04-server-components-data/01-server-components-by-default', label: '01. Server Components by default' },
      { href: '/playground/phase-04-server-components-data/02-use-client-boundary', label: "02. The 'use client' boundary in practice" },
      { href: '/playground/phase-04-server-components-data/03-composing-server-client', label: '03. Composing Server & Client Components' },
      { href: '/playground/phase-04-server-components-data/04-async-server-components', label: '04. Fetching data directly in Server Components' },
      { href: '/playground/phase-04-server-components-data/05-parallel-vs-waterfall-fetching', label: '05. Parallel fetching vs sequential waterfalls' },
      { href: '/playground/phase-04-server-components-data/06-streaming-with-suspense', label: '06. Streaming with Suspense boundaries' },
      { href: '/playground/phase-04-server-components-data/07-server-only-client-only', label: '07. server-only / client-only packages' },
      { href: '/playground/phase-04-server-components-data/08-serialization-boundary', label: '08. Passing data across the server/client boundary' },
      { href: '/playground/phase-04-server-components-data/09-wrapping-third-party-libs', label: '09. Wrapping third-party client-only libraries' },
    ],
  },
  {
    phase: 'Phase 5 — Server Actions & Mutations',
    items: [
      { href: '/playground/phase-05-server-actions/01-defining-server-actions', label: "01. Defining Server Actions ('use server')" },
      { href: '/playground/phase-05-server-actions/02-server-actions-in-forms', label: '02. Calling Server Actions from forms' },
      { href: '/playground/phase-05-server-actions/03-use-form-status', label: '03. useFormStatus & pending states' },
      { href: '/playground/phase-05-server-actions/04-use-action-state', label: '04. useActionState — form state & validation errors' },
      { href: '/playground/phase-05-server-actions/05-use-optimistic', label: '05. useOptimistic — optimistic UI' },
      { href: '/playground/phase-05-server-actions/06-revalidating-after-mutation', label: '06. Revalidating data after a mutation' },
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
