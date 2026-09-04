import Link from 'next/link';

export default function ParallelRoutesIndex() {
  return (
    <div>
      <p>
        The two boxes below render simultaneously — the <code>@team</code> and <code>@analytics</code> slots —
        alongside this text, which is the implicit <code>children</code> slot.
      </p>
      <Link href="/playground/phase-02-app-router/07-parallel-routes/team-settings">
        Navigate the @team slot to /team-settings (watch @analytics stay put)
      </Link>
    </div>
  );
}
