// Shared in-memory state for this demo only — resets on server restart/rebuild.
const accounts: string[] = [];

export function createAccount(email: string) {
  accounts.push(email);
}

export function listAccounts() {
  return accounts;
}
