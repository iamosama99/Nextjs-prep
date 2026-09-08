// Shared in-memory state for this demo only — resets on server restart/rebuild
// and isn't shared across serverless instances. A real Server Action persists
// its mutation in a database, not module state.
let fileLevelCount = 0;
let inlineCount = 0;

export function incrementFileLevel() {
  fileLevelCount += 1;
  return fileLevelCount;
}

export function incrementInline() {
  inlineCount += 1;
  return inlineCount;
}

export function readCounts() {
  return { fileLevelCount, inlineCount };
}
