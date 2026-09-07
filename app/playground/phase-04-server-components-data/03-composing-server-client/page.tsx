import { Modal } from './Modal';
import Cart from './Cart';
import { ThemeProvider, ThemeConsumer } from './ThemeProvider';

// This page (a Server Component) owns both Modal and Cart, and both Modal
// and ThemeProvider — it's the JSX here that determines where each child
// actually renders, not whichever component ends up containing it visually.
export default function ComposingServerClientPage() {
  return (
    <div>
      <h1>Composing Server & Client Components</h1>
      <p>
        <code>Modal</code> is a Client Component. <code>Cart</code> is a Server Component, passed as{' '}
        <code>children</code> — <code>Modal</code>&apos;s file never imports it. Toggle the modal closed
        and reopen it; the cart items were rendered once, on the server, and are just being shown/hidden
        client-side.
      </p>
      <Modal title={<strong>Your cart</strong>}>
        <Cart />
      </Modal>

      <h2 style={{ marginTop: 24 }}>Context through a Client Component wrapper</h2>
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    </div>
  );
}
