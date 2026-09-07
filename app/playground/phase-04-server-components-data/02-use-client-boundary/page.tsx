import Panel from './Panel';

export default function UseClientBoundaryPage() {
  return (
    <div>
      <h1>The Client Component boundary in practice</h1>
      <p>
        This page (a Server Component) renders <code>&lt;Panel /&gt;</code>, the only file here with{' '}
        <code>&apos;use client&apos;</code>. Everything <code>Panel</code> imports — <code>Icon</code>,{' '}
        <code>TabsDemo</code>, and transitively <code>Tabs</code> — is pulled into the client bundle with
        it, none of them needing their own directive.
      </p>
      <p>
        <code>Tabs.tsx</code> has a comment with an exercise: try importing <code>Tabs</code> directly into
        <em> this Server Component</em> and writing <code>&lt;Tabs.Item&gt;</code> — then run{' '}
        <code>npm run build</code> to see the compound-component gotcha from the notes fire for real.
      </p>
      <Panel />
    </div>
  );
}
