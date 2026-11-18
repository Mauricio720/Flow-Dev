export {};

const POLL_INTERVAL_MS = 1000;

const { createProductionIssueDeletionWorker } = await import("../infra/issueDeletionComposition");
const worker = createProductionIssueDeletionWorker();

const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());

while (!abort.signal.aborted) {
  const handled = await worker.tick().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ event: "issueDeletion.worker.tick_failed", errorName: error instanceof Error ? error.name : typeof error })}\n`);
    return false;
  });
  if (!handled) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}
