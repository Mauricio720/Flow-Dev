import type { RuntimeHandle } from "../../terminal/claudeSessionRuntime";

export class SessionHandleRegistry {
  private readonly handles = new Map<string, RuntimeHandle>();

  set(sessionId: string, handle: RuntimeHandle) {
    this.handles.set(sessionId, handle);
  }

  get(sessionId: string) {
    return this.handles.get(sessionId);
  }

  delete(sessionId: string) {
    this.handles.delete(sessionId);
  }

  ids() {
    return [...this.handles.keys()];
  }

  async abandonAll() {
    const open = [...this.handles.values()];
    this.handles.clear();
    await Promise.allSettled(open.map((handle) => handle.abandon()));
  }
}
