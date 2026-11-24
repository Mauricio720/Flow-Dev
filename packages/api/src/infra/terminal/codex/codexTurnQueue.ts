export class CodexTurnQueue {
  private active = true;
  private readonly queued: string[] = [];
  enqueue(message: string) {
    if (this.active) { this.queued.push(message); return null; }
    this.active = true;
    return message;
  }
  complete() {
    const next = this.queued.shift() ?? null;
    this.active = next !== null;
    return next;
  }
  fail() { this.queued.length = 0; this.active = false; }
}
