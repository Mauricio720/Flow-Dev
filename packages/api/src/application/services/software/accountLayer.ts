import type { ConnectionRecord } from "../../database/dao/softwareDao";
import type { LayerInput } from "../../software/readiness";

const NO_CONNECTION = "no_connection";

export function projectAccountLayer(connections: ConnectionRecord[]): LayerInput {
  if (connections.length === 0) return { state: "blocked", reasonCode: NO_CONNECTION };
  if (connections.some((connection) => connection.authState === "connected")) return { state: "ready" };
  return { state: "blocked", reasonCode: "auth_required" };
}
