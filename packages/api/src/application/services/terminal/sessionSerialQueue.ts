export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue(operation: () => Promise<void>) {
    this.tail = this.tail.then(operation, operation);
  }

  flush(): Promise<void> {
    return this.tail;
  }
}
