import { io } from 'next/cache';
import { readCounts } from './store';

// io() forces this to run per-request instead of being baked into the static
// shell at build time (see Phase 3 Topic 1) — otherwise both counts would
// freeze at whatever they were during `next build`.
export default async function Counters() {
  await io();
  const { fileLevelCount, inlineCount } = readCounts();
  return (
    <ul>
      <li>
        Inline action count (server-rendered): <strong>{inlineCount}</strong>
      </li>
      <li>
        File-level action count (server-rendered): <strong>{fileLevelCount}</strong>
      </li>
    </ul>
  );
}
