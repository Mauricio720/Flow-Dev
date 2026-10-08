import { MANAGED_PERMISSION_MODE } from "../../../application/spec/specPins";
import type { RuntimeCapabilities, RuntimeConfiguration, RuntimePins } from "../../../application/spec/specRuntimeGateway";
import { agentSchema, identitySchema } from "./compozySchemas";
import { callOk } from "./compozyCall";
import { SpecRuntimeError } from "./compozyErrors";
import type { CompozyTransport } from "./compozyTransport";

const PIN_KEYS: (keyof RuntimePins)[] = ["version", "openApiSha256", "binarySha256", "bundleSha256"];

function normalizeVersion(value: string) {
  return value.startsWith("v") ? value.slice(1) : value;
}

export function assertPins(config: RuntimeConfiguration) {
  const mismatch = PIN_KEYS.some((key) => normalizeVersion(config.declared[key]) !== normalizeVersion(config.accepted[key]));
  if (mismatch) throw new SpecRuntimeError("runtime_incompatible");
}

export async function runPreflight(transport: CompozyTransport, config: RuntimeConfiguration, checkProvider = true): Promise<RuntimeCapabilities> {
  assertPins(config);
  const identity = await incompatibleOnFailure(() => callOk(transport, { request: { method: "GET", path: "/api/status/identity" }, schema: identitySchema, accepted: [200] }));
  if (normalizeVersion(identity.daemon.version) !== normalizeVersion(config.accepted.version)) throw new SpecRuntimeError("runtime_incompatible");
  const { agent } = await incompatibleOnFailure(() => callOk(transport, { request: { method: "GET", path: `/api/agents/${encodeURIComponent(config.agentName)}` }, schema: agentSchema, accepted: [200] }));
  const permissionsOk = agent.permissions === (config.permissionMode ?? MANAGED_PERMISSION_MODE);
  const providerOk = !checkProvider || (agent.provider === config.provider && (!agent.model || agent.model === config.model));
  if (!permissionsOk || !providerOk) throw new SpecRuntimeError("runtime_incompatible");
  return { version: identity.daemon.version, schemaVersion: identity.schema_version, permissions: agent.permissions!, provider: agent.provider, definitionDigest: agent.definition_digest };
}

async function incompatibleOnFailure<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof SpecRuntimeError && error.reason === "runtime_incompatible") throw error;
    throw new SpecRuntimeError("runtime_incompatible");
  }
}
