import { getRawRow } from './data';
import UserBadge from './UserBadge';

// Exercise (see data.ts for the Money class): try changing this page to
// `import { Money } from './data'`, construct `new Money(1999)`, and pass it
// as a prop to UserBadge (e.g. temporarily add `price={priceInstance}` to
// both UserBadge's prop type and this call). Run `npm run build` to see a
// real serialization error — class instances cannot cross from a Server
// Component to a Client Component. Revert afterward.
export default async function SerializationBoundaryPage() {
  const row = await getRawRow();

  // DTO shaping happens HERE, before anything is passed to a Client
  // Component — not inside UserBadge, by which point it would be too late.
  const dto = { name: row.name, bio: row.bio };

  return (
    <div>
      <h1>Passing data across the server/client boundary</h1>
      <p>
        <code>getRawRow()</code> returns a row with a <code>passwordHash</code> field. This page shapes it
        into a minimal DTO (<code>name</code>, <code>bio</code> only) before passing it to{' '}
        <code>&lt;UserBadge&gt;</code>, a Client Component — <code>passwordHash</code> never exists in the
        object that actually crosses the boundary.
      </p>
      <UserBadge name={dto.name} bio={dto.bio} />
    </div>
  );
}
