import { createProductionClaimReconciliation } from "../infra/assignedIssuesComposition";

const POLL_INTERVAL_MS = 15_000;
const SWEEP_BATCH_SIZE = 25;

const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());

const reconciliation = createProductionClaimReconciliation();

while (!abort.signal.aborted) {
  await reconciliation.sweep(SWEEP_BATCH_SIZE).catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ event: "claim.reconcile_failed", errorName: error instanceof Error ? error.name : typeof error })}\n`);
    return 0;
  });
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}
