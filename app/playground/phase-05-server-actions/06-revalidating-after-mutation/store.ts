// Deliberately NOT cached — a plain in-memory counter read fresh on every
// dynamic render, so this demo can isolate "did the current route get
// re-rendered as part of the action's response at all" from "did the cached
// headline specifically get invalidated."
let mutationCount = 0;

export function bumpMutationCount() {
  mutationCount += 1;
  return mutationCount;
}

export function readMutationCount() {
  return mutationCount;
}
