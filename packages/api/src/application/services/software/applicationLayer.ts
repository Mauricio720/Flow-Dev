import type { SettingsRecord } from "../../database/dao/softwareDao";
import type { LayerInput } from "../../software/readiness";

export function projectApplicationLayer(settings: SettingsRecord): LayerInput {
  if (!settings.enabled) return { state: "blocked", reasonCode: "software_disabled" };
  if (!settings.docsProxyUrl) return { state: "blocked", reasonCode: "docs_proxy_required" };
  return { state: "ready" };
}
