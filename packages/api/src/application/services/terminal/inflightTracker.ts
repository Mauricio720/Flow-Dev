export class InflightTracker {
  private readonly pending = new Set<Promise<unknown>>();

  track<T>(operation: Promise<T>): Promise<T> {
    this.pending.add(operation);
    const forget = () => this.pending.delete(operation);
    operation.then(forget, forget);
    return operation;
  }

  async idle() {
    while (this.pending.size > 0) await Promise.allSettled([...this.pending]);
  }
}
