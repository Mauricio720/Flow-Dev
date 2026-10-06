import { loadSpecConfiguration, SpecConfigurationError, type SpecConfiguration, type SpecConfigurationProbe } from "../infra/spec/specConfiguration";

export type SpecWorkerCliDependencies = {
  probe: SpecConfigurationProbe;
  start: (configuration: SpecConfiguration) => Promise<void>;
  log: (line: string) => void;
};
const SUPPORTED_MODE = "run";
const USAGE_EXIT_CODE = 2;
const CONFIGURATION_EXIT_CODE = 1;

export async function runSpecWorkerCli(input: { argv: string[]; env: Record<string, string | undefined>; deps: SpecWorkerCliDependencies }) {
  const [mode = SUPPORTED_MODE, ...extra] = input.argv;
  if (mode !== SUPPORTED_MODE || extra.length > 0) {
    input.deps.log(JSON.stringify({ event: "spec.worker.usage", supportedMode: SUPPORTED_MODE }));
    return USAGE_EXIT_CODE;
  }
  try {
    const configuration = await loadSpecConfiguration(input.env, input.deps.probe);
    await input.deps.start(configuration);
    return 0;
  } catch (error) {
    if (!(error instanceof SpecConfigurationError)) throw error;
    input.deps.log(JSON.stringify({ event: "spec.worker.config_rejected", reason: error.reason, setting: error.setting }));
    return CONFIGURATION_EXIT_CODE;
  }
}
