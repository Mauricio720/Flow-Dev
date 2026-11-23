import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

export class UserMessageQueue implements AsyncIterable<SDKUserMessage> {
  private pending: SDKUserMessage[] = [];
  private waiter: ((result: IteratorResult<SDKUserMessage>) => void) | null = null;
  private closed = false;

  push(text: string) {
    const message: SDKUserMessage = { type: "user", message: { role: "user", content: text }, parent_tool_use_id: null };
    if (!this.waiter) {
      this.pending.push(message);
      return;
    }
    this.waiter({ value: message, done: false });
    this.waiter = null;
  }

  close() {
    this.closed = true;
    this.waiter?.({ value: undefined, done: true });
    this.waiter = null;
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return { next: () => this.next() };
  }

  private next(): Promise<IteratorResult<SDKUserMessage>> {
    const message = this.pending.shift();
    if (message) return Promise.resolve({ value: message, done: false });
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve) => { this.waiter = resolve; });
  }
}
