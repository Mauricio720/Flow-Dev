export {};

const POLL_INTERVAL_MS = 1000;

const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());

const { createProductionTaskFlowDispatcher } = await import("../infra/taskFlowWorkerComposition");
const dispatcher = await createProductionTaskFlowDispatcher(process.env);

while (!abort.signal.aborted) {
  const handled = await dispatcher.runOnce().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ event: "taskflow.worker.tick_failed", errorName: error instanceof Error ? error.name : typeof error })}\n`);
    return false;
  });
  if (!handled) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}
