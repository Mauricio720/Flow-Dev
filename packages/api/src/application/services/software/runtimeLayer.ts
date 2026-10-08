import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { LayerInput } from "../../software/readiness";

export async function projectRuntimeLayer(gateway: CompozyControlGateway): Promise<LayerInput> {
  const identity = await gateway.checkRuntime();
  if (identity.ok) return { state: "ready" };
  if (identity.code === "service_unavailable") return { state: "unknown", reasonCode: "runtime_unreachable" };
  return { state: "blocked", reasonCode: identity.code };
}
