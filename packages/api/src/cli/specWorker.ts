import { runSpecWorkerCli } from "./specWorkerMain";
import { productionConfigurationProbe } from "../infra/spec/specConfigurationProbe";

const POLL_INTERVAL_MS = 1000;

const exitCode = await runSpecWorkerCli({
  argv: process.argv.slice(2),
  env: process.env,
  deps: {
    probe: productionConfigurationProbe,
    log: (line) => process.stderr.write(`${line}\n`),
    start: async (configuration) => {
      const { createProductionSpecWorkerController } = await import("../infra/specWorkerComposition");
      const controller = createProductionSpecWorkerController(configuration);
      const abort = new AbortController();
      process.once("SIGINT", () => abort.abort());
      process.once("SIGTERM", () => abort.abort());
      while (!abort.signal.aborted) {
        await controller.tick().catch((error: unknown) => process.stderr.write(`${JSON.stringify({ event: "spec.worker.tick_failed", errorName: error instanceof Error ? error.name : typeof error })}\n`));
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    },
  },
});
process.exit(exitCode);
