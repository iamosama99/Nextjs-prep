// Shared in-memory state for this demo only — resets on server restart/rebuild.
let serverFormCount = 0;
let clientFormCount = 0;
let onClickCount = 0;

export function bumpServerFormCount() {
  serverFormCount += 1;
  return serverFormCount;
}
export function bumpClientFormCount() {
  clientFormCount += 1;
  return clientFormCount;
}
export function bumpOnClickCount() {
  onClickCount += 1;
  return onClickCount;
}

export function readCounts() {
  return { serverFormCount, clientFormCount, onClickCount };
}
