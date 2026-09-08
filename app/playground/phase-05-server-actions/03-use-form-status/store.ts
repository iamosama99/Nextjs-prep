// Shared in-memory state for this demo only — resets on server restart/rebuild.
let savedText = '(nothing saved yet)';

export function readSaved() {
  return savedText;
}

export function writeSaved(text: string) {
  savedText = text;
}
