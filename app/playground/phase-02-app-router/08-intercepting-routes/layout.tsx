export default function InterceptingRoutesLayout(
  props: LayoutProps<'/playground/phase-02-app-router/08-intercepting-routes'>
) {
  return (
    <div>
      <h1>Intercepting routes</h1>
      {props.children}
      {props.modal}
    </div>
  );
}
