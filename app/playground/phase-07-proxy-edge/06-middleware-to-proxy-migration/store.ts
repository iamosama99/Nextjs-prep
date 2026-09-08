// Shared in-memory state for this demo only — resets on server restart/rebuild.
let hitCount = 0;

export function bumpHits() {
  hitCount += 1;
  return hitCount;
}

export function readHits() {
  return hitCount;
}
