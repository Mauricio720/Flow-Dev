import type { RuntimePermissionResult } from "../../terminal/claudeSessionRuntime";

export type PendingEntry = { sessionId: string; input: Record<string, unknown>; resolve: (result: RuntimePermissionResult) => void };

export class PendingRequestRegistry {
  private readonly entries = new Map<string, PendingEntry>();

  add(requestId: string, entry: PendingEntry) {
    this.entries.set(requestId, entry);
  }

  take(requestId: string): PendingEntry | undefined {
    const entry = this.entries.get(requestId);
    this.entries.delete(requestId);
    return entry;
  }

  ids(): string[] {
    return [...this.entries.keys()];
  }

  takeAllOf(sessionId: string): PendingEntry[] {
    const owned = [...this.entries].filter(([, entry]) => entry.sessionId === sessionId);
    for (const [requestId] of owned) this.entries.delete(requestId);
    return owned.map(([, entry]) => entry);
  }
}
