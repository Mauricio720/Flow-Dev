import type { SpecConfiguration } from "./specConfiguration";

export type ContainerPlanInput = { configuration: SpecConfiguration; attemptId: string; snapshotPath: string; inputsPath: string; candidatePath: string; scratchPath: string; socketDirectory: string };

const CPUS = "2";
const MEMORY = "4g";
const PIDS_LIMIT = "256";
const SCRATCH_SIZE = "2g";
const SOCKET_PATH_IN_CONTAINER = "/run/flow-spec";
const CODEX_HOME_IN_CONTAINER = "/run/codex-home";

export function buildContainerArguments(input: ContainerPlanInput) {
  const { configuration } = input;
  const authArguments = configuration.auth.kind === "codex_chatgpt"
    ? ["--mount", `type=bind,source=${configuration.auth.home},target=${CODEX_HOME_IN_CONTAINER},rw`, "--env", `CODEX_HOME=${CODEX_HOME_IN_CONTAINER}`]
    : ["--secret", `${configuration.auth.ref},type=env,target=SPEC_PROVIDER_CREDENTIAL`];
  return [
    "run", "--detach", "--rm", "--name", `flow-spec-${input.attemptId}`,
    "--read-only", "--cap-drop=all", "--security-opt=no-new-privileges", "--userns=keep-id",
    `--cpus=${CPUS}`, `--memory=${MEMORY}`, `--pids-limit=${PIDS_LIMIT}`,
    "--network=flow-spec-egress", "--no-hosts", "--no-hostname",
    "--tmpfs", `/tmp:rw,noexec,nosuid,size=${SCRATCH_SIZE}`,
    "--mount", `type=bind,source=${input.snapshotPath},target=/workspace/repository,ro`,
    "--mount", `type=bind,source=${input.inputsPath},target=/workspace/inputs,ro`,
    "--mount", `type=bind,source=${input.candidatePath},target=/workspace/candidate,rw`,
    "--mount", `type=bind,source=${input.scratchPath},target=/var/lib/compozy,rw`,
    "--mount", `type=bind,source=${input.socketDirectory},target=${SOCKET_PATH_IN_CONTAINER},rw`,
    ...authArguments,
    "--env", `SPEC_DOCS_PROXY_URL=${configuration.docsProxyUrl}`,
    "--env", `SPEC_PROVIDER=${configuration.provider}`,
    "--env", `SPEC_MODEL=${configuration.model}`,
    configuration.runtimeImage,
  ];
}
