import type { ConnectionRecord } from "../../database/dao/softwareDao";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { ReadinessLayer, ReadinessProjection, ReadinessState } from "../../software/readiness";

export type ConnectionReadiness = {
  state: ReadinessState;
  blockedBy: ReadinessLayer | "connection" | null;
  reasonCode: string | null;
  selectableModels: number;
};

const SHARED_LAYERS: ReadinessLayer[] = ["application", "runtime", "host"];
const NOT_READY = (blockedBy: ConnectionReadiness["blockedBy"], reasonCode: string): ConnectionReadiness => ({ state: "blocked", blockedBy, reasonCode, selectableModels: 0 });

function sharedBlocker(projection: ReadinessProjection) {
  return SHARED_LAYERS.map((layer) => projection.layers[layer]).find((layer) => layer.state !== "ready");
}

export async function connectionReadiness(input: { connection: ConnectionRecord; projection: ReadinessProjection; gateway: CompozyControlGateway }): Promise<ConnectionReadiness> {
  const { connection, projection, gateway } = input;
  if (connection.disabledAt || connection.authState !== "connected") return NOT_READY("connection", connection.authState === "connected" ? "disabled" : "auth_required");
  const blocker = sharedBlocker(projection);
  if (blocker) return NOT_READY(blocker.layer, blocker.reasonCode ?? "check_missing");
  const probe = await gateway.probeProvider(connection.runtimeProviderId);
  if (!probe.ok) return NOT_READY("runtime", probe.code);
  if (!probe.value.authenticated) return NOT_READY("connection", "auth_required");
  const models = await gateway.listModels(connection.runtimeProviderId);
  if (!models.ok) return NOT_READY("runtime", models.code);
  const selectableModels = models.value.filter((model) => model.selectable).length;
  if (selectableModels === 0) return NOT_READY("runtime", "catalog_stale");
  return { state: "ready", blockedBy: null, reasonCode: null, selectableModels };
}
