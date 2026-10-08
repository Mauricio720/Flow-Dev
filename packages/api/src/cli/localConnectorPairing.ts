const RETRY_DELAY_MS = 3_000;
const RETRYABLE_REASONS = ["connector_unavailable", "service_unavailable", "pairing_expired"];

type Input = { isPaired: () => Promise<boolean>; pair: () => Promise<unknown>; sleep?: (ms: number) => Promise<void> };

export async function ensurePaired({ isPaired, pair, sleep = delay }: Input) {
  while (!await isPaired()) {
    try {
      await pair();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      await sleep(RETRY_DELAY_MS);
    }
  }
}

function isRetryable(error: unknown) {
  return error instanceof Error && RETRYABLE_REASONS.includes(error.message);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
