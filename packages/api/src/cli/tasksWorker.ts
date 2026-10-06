import { createProductionTaskWorkerController } from "../infra/composition";

const controller = createProductionTaskWorkerController();
const abort = new AbortController();
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());
await controller.runPool(abort.signal);
