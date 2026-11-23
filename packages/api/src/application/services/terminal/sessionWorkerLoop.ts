export const TICK_INTERVAL_MS = 1_000;

export type LoopDeps = { tick: () => Promise<void>; signal: AbortSignal; wait: (ms: number, signal: AbortSignal) => Promise<void> };

export async function runSessionLoop(deps: LoopDeps) {
  while (!deps.signal.aborted) {
    await deps.tick();
    await deps.wait(TICK_INTERVAL_MS, deps.signal);
  }
}
