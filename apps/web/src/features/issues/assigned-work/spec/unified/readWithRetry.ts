const RETRY_DELAYS_MS = [800, 2000];

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function readWithRetry<T>(read: () => Promise<T>, isActive: () => boolean = () => true): Promise<T> {
  for (const delayMs of RETRY_DELAYS_MS) {
    try {
      return await read();
    } catch {
      await wait(delayMs);
    }
    if (!isActive()) break;
  }
  return read();
}
