import { createHash } from "node:crypto";
import type { SettingsValues } from "../../database/dao/softwareDao";
import { SoftwareError } from "./softwareErrors";

export const MIN_ACTIVE_ACTIONS = 1;
export const MAX_ACTIVE_ACTIONS = 4;
export const DOCS_PROXY_MAX_LENGTH = 2048;
const HTTPS_PROTOCOL = "https:";

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function assertDocsProxy(values: SettingsValues) {
  if (values.docsProxyUrl === null) {
    if (values.enabled) throw new SoftwareError("docs_proxy_required", { docsProxyUrl: "Informe a URL HTTPS do proxy de documentação" });
    return;
  }
  const parsed = parseUrl(values.docsProxyUrl);
  const valid = parsed?.protocol === HTTPS_PROTOCOL && !parsed.username && !parsed.password;
  if (!valid) throw new SoftwareError("docs_proxy_https_required", { docsProxyUrl: "Use uma URL HTTPS sem credenciais" });
}

export function assertSettingsValues(values: SettingsValues) {
  const withinRange = Number.isInteger(values.maxActiveActions) && values.maxActiveActions >= MIN_ACTIVE_ACTIONS && values.maxActiveActions <= MAX_ACTIVE_ACTIONS;
  if (!withinRange) throw new SoftwareError("max_active_actions_out_of_range", { maxActiveActions: "Use um valor entre 1 e 4" });
  assertDocsProxy(values);
}

export function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
