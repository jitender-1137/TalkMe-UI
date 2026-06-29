// In-memory cache of the original File objects for optimistic media messages, keyed
// by clientId. A File can't be persisted to IndexedDB and a blob: preview URL is not
// reachable by the server, so when an upload fails we keep the File here long enough
// for a retry to RE-UPLOAD it (instead of re-sending a dead blob URL to the recipient).
//
// Lifetime is the session only: cleared on successful send, on a terminal (size) error,
// and naturally lost on reload — a reload-then-retry can't re-upload, which the retry
// path handles by asking the user to reattach the file.

const pendingFiles = new Map<string, File>()

export function rememberPendingFile(clientId: string, file: File): void {
  pendingFiles.set(clientId, file)
}

export function getPendingFile(clientId: string): File | undefined {
  return pendingFiles.get(clientId)
}

export function forgetPendingFile(clientId: string): void {
  pendingFiles.delete(clientId)
}
