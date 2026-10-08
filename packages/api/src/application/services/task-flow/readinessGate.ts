import { READINESS_LAYERS, type ReadinessLayer, type ReadinessProjection } from "../../software/readiness";
import { TaskFlowError, type TaskFlowReason } from "./taskFlowErrors";

export type ExecutionTarget = "host" | "machine";

const LAYER_REASONS: Record<ReadinessLayer, TaskFlowReason> = {
  application: "software_not_enabled",
  account: "auth_required",
  runtime: "runtime_incompatible",
  host: "runtime_incompatible",
};

// A run on the operator's machine uses that machine's runtime and accounts, so only the application layer applies.
const MACHINE_LAYERS: readonly ReadinessLayer[] = ["application"];

export function blockedLayer(projection: ReadinessProjection, target: ExecutionTarget = "host"): ReadinessLayer | null {
  const layers = target === "machine" ? MACHINE_LAYERS : READINESS_LAYERS;
  return layers.find((layer) => projection.layers[layer].state !== "ready") ?? null;
}

export function assertReadyForStart(projection: ReadinessProjection, target: ExecutionTarget = "host") {
  if (target === "host" && projection.stale) throw new TaskFlowError("service_unavailable");
  const blocked = blockedLayer(projection, target);
  if (blocked) throw new TaskFlowError(LAYER_REASONS[blocked], undefined, { layer: blocked });
}
