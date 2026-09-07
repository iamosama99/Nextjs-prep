// A genuine Server Component: no directive, and it "fetches" data the way a
// real cart would. It's never imported by Modal.tsx — only its rendered
// output crosses into the client-rendered Modal, via the children slot.
async function getCartItems() {
  // Simulates a server-side data fetch (a real one would hit a DB/API).
  return [
    { id: 1, name: 'Keyboard', price: 89 },
    { id: 2, name: 'Monitor stand', price: 34 },
  ];
}

export default async function Cart() {
  const items = await getCartItems();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name} — ${item.price}
        </li>
      ))}
    </ul>
  );
}
