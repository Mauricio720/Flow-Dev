import { createAgentRuntime } from "../infra/agentComposition";
import { createProductionTaskWorkerController } from "../infra/composition";
import { requireDatabase } from "../infra/database/client";

const runtime = createAgentRuntime(requireDatabase());
const controller = createProductionTaskWorkerController(runtime);
const abort = new AbortController();
abort.signal.addEventListener("abort", () => void runtime.runner.shutdown(), { once: true });
process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());
await runtime.endpoint.start();
try {
  await controller.runPool(abort.signal);
} finally {
  await runtime.runner.shutdown();
  await runtime.endpoint.stop();
}
