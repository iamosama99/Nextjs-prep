// Shared in-memory state for this demo only — resets on server restart/rebuild.
export type Message = { id: string; text: string };

let messages: Message[] = [{ id: '0', text: 'Welcome to the thread.' }];
let nextId = 1;

export function listMessages() {
  return messages;
}

export function addMessage(text: string) {
  const message = { id: String(nextId++), text };
  messages = [...messages, message];
  return message;
}
