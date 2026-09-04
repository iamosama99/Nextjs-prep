export default function ParallelRoutesLayout(
  props: LayoutProps<'/playground/phase-02-app-router/07-parallel-routes'>
) {
  return (
    <div>
      <h1>Parallel routes</h1>
      {props.children}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <div style={{ border: '1px solid #ccc', padding: 12 }}>{props.team}</div>
        <div style={{ border: '1px solid #ccc', padding: 12 }}>{props.analytics}</div>
      </div>
    </div>
  );
}
