// The CompozyOS daemon keeps its own workspace database, registration and the published review Loop inside the checkout while a run is active.
const COMPOZY_RUNTIME_STATE_PATTERN = /^\.compozy\/(?:compozy\.db(?:-wal|-shm|-journal)?|workspace\.toml|loops\/review-and-fix\/loop\.yaml)$/;

export function isCompozyRuntimeState(path: string) {
  return COMPOZY_RUNTIME_STATE_PATTERN.test(path);
}
