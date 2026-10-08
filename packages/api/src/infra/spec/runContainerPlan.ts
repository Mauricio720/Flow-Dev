export type RunContainerInput = {
  runId: string;
  image: string;
  docsProxyUrl: string;
  repositoryPath: string;
  homePath: string;
  socketDirectory: string;
  grants: { connectionId: string; mountPath: string }[];
  providers: string;
};

const CPUS = "2";
const MEMORY = "4g";
const PIDS_LIMIT = "256";
const SCRATCH_SIZE = "2g";
const SOCKET_PATH_IN_CONTAINER = "/run/flow-spec";
const GRANTS_PATH_IN_CONTAINER = "/run/grants";

export function buildRunContainerArguments(input: RunContainerInput) {
  const grantMounts = input.grants.flatMap((grant) => ["--mount", `type=bind,source=${grant.mountPath},target=${GRANTS_PATH_IN_CONTAINER}/${grant.connectionId},rw`]);
  return [
    "run", "--detach", "--rm", "--name", `flow-run-${input.runId}`,
    "--read-only", "--cap-drop=all", "--security-opt=no-new-privileges", "--userns=keep-id",
    `--cpus=${CPUS}`, `--memory=${MEMORY}`, `--pids-limit=${PIDS_LIMIT}`,
    "--network=flow-spec-egress", "--no-hosts",
    "--tmpfs", `/tmp:rw,noexec,nosuid,size=${SCRATCH_SIZE}`,
    "--mount", `type=bind,source=${input.repositoryPath},target=/workspace,rw`,
    "--mount", `type=bind,source=${input.homePath},target=/var/lib/compozy,rw`,
    "--mount", `type=bind,source=${input.socketDirectory},target=${SOCKET_PATH_IN_CONTAINER},rw`,
    ...grantMounts,
    "--env", `SPEC_DOCS_PROXY_URL=${input.docsProxyUrl}`,
    "--env", `FLOW_GRANTS_ROOT=${GRANTS_PATH_IN_CONTAINER}`,
    "--env", `FLOW_PROVIDERS=${input.providers}`,
    input.image,
  ];
}
