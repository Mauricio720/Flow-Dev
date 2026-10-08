import type { HostChecks } from "./hostChecks";
import type { LayerInput } from "./readiness";

const HOST_CHECK_REASONS: [keyof HostChecks, string][] = [
  ["workspaceRootWritable", "workspace_root_unavailable"],
  ["runtimeImagePinned", "runtime_image_unpinned"],
  ["isolationEnforceable", "rootless_isolation_unavailable"],
  ["credentialRootPrivate", "credential_root_not_private"],
];

export function projectHostLayer(checks: HostChecks | null): LayerInput {
  if (!checks) return { state: "unknown", reasonCode: "host_check_failed" };
  const failing = HOST_CHECK_REASONS.find(([key]) => checks[key] !== true);
  if (!failing) return { state: "ready" };
  return { state: "blocked", reasonCode: failing[1] };
}
