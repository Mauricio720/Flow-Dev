import { createProductionSessionWorker } from "../infra/sessionWorkerComposition";

const worker = createProductionSessionWorker();
const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());
console.info(`[session] service_started host=${worker.hostId} worker=${worker.workerId}`);
await worker.supervisor.beat();
await worker.run(abort.signal);
console.info("[session] service_stopped");
process.exit(0);
