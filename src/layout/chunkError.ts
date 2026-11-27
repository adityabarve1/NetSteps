// A page or lesson is its own chunk. When the browser cannot fetch one (the
// visitor went offline, or a new release replaced the file), the dynamic import
// rejects with a browser-specific message. Only real Error objects count, and
// only these known messages, so a genuine bug is never mistaken for a network
// problem.
const CHUNK_MESSAGES =
  /dynamically imported module|importing a module script failed|loading (css )?chunk [\w-]+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'ChunkLoadError' || CHUNK_MESSAGES.test(error.message);
}
