import { COMPOZY_PIN, MANAGED_AGENT_NAME } from "../../application/spec/specPins";
import type { RuntimePins } from "../../application/spec/specRuntimeGateway";
import type { SpecReason } from "../../application/services/spec/specContracts";
import { isAbsolute, relative, resolve } from "node:path";

export class SpecConfigurationError extends Error {
  constructor(readonly reason: SpecReason, readonly setting: string) {
    super(`${reason}:${setting}`);
    this.name = "SpecConfigurationError";
  }
}

export type SpecConfiguration = {
  runnerId: string;
  workspaceRoot: string;
  runtimeRoot: string;
  runtimeImage: string;
  provider: string;
  model: string;
  auth: { kind: "codex_chatgpt"; home: string } | { kind: "provider_secret"; ref: string };
  docsProxyUrl: string;
  agentName: string;
  declaredPins: RuntimePins;
};
export type SpecConfigurationProbe = {
  directoryWritable(path: string): Promise<boolean>;
  bundleDigest(): Promise<string>;
  isolationEnforceable(): Promise<boolean>;
  codexChatGptLoginReady(path: string): Promise<boolean>;
};
type Environment = Record<string, string | undefined>;

const IMAGE_DIGEST_PATTERN = /@sha256:[0-9a-f]{64}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const PUBLIC_PREFIX = "NEXT_PUBLIC_SPEC_";
const REQUIRED_SHARED_SETTINGS = ["DATABASE_URL", "GITHUB_REPOSITORY_TOKEN_KEY", "GITHUB_REPOSITORY_CLIENT_ID", "GITHUB_REPOSITORY_CLIENT_SECRET"];
const REQUIRED_SETTINGS = ["SPEC_RUNNER_ID", "SPEC_WORKSPACE_ROOT", "SPEC_RUNTIME_IMAGE", "SPEC_PROVIDER", "SPEC_MODEL", "SPEC_DOCS_PROXY_URL", "SPEC_COMPOZY_BINARY_SHA256", "SPEC_COMPOZY_OPENAPI_SHA256", "SPEC_BUNDLE_SHA256"];

const unconfigured = (setting: string) => new SpecConfigurationError("runtime_unconfigured", setting);
const incompatible = (setting: string) => new SpecConfigurationError("runtime_incompatible", setting);

export async function loadSpecConfiguration(env: Environment, probe: SpecConfigurationProbe): Promise<SpecConfiguration> {
  const exposed = Object.keys(env).find((key) => key.startsWith(PUBLIC_PREFIX));
  if (exposed) throw incompatible(exposed);
  if (env.SPEC_ENABLED !== "true") throw unconfigured("SPEC_ENABLED");
  for (const setting of REQUIRED_SETTINGS) if (!env[setting]?.trim()) throw unconfigured(setting);
  const value = (setting: string) => env[setting]!.trim();
  const workspaceRoot = value("SPEC_WORKSPACE_ROOT");
  if (!workspaceRoot.startsWith("/") || !(await probe.directoryWritable(workspaceRoot))) throw unconfigured("SPEC_WORKSPACE_ROOT");
  for (const setting of REQUIRED_SHARED_SETTINGS) if (!env[setting]?.trim()) throw unconfigured(setting);
  assertPins(value, await probe.bundleDigest());
  if (!IMAGE_DIGEST_PATTERN.test(value("SPEC_RUNTIME_IMAGE"))) throw unconfigured("SPEC_RUNTIME_IMAGE");
  if (!value("SPEC_DOCS_PROXY_URL").startsWith("https://")) throw unconfigured("SPEC_DOCS_PROXY_URL");
  if (!(await probe.isolationEnforceable())) throw unconfigured("SPEC_ISOLATION");
  const auth = await loadAuth(env, probe, workspaceRoot);
  return { runnerId: value("SPEC_RUNNER_ID"), workspaceRoot, runtimeRoot: `${workspaceRoot}/.runtime`, runtimeImage: value("SPEC_RUNTIME_IMAGE"), provider: value("SPEC_PROVIDER"), model: value("SPEC_MODEL"), auth, docsProxyUrl: value("SPEC_DOCS_PROXY_URL"), agentName: env.SPEC_AGENT_NAME?.trim() || MANAGED_AGENT_NAME, declaredPins: { version: env.SPEC_COMPOZY_VERSION?.trim() || COMPOZY_PIN.version, binarySha256: value("SPEC_COMPOZY_BINARY_SHA256"), openApiSha256: value("SPEC_COMPOZY_OPENAPI_SHA256"), bundleSha256: value("SPEC_BUNDLE_SHA256") } };
}

async function loadAuth(env: Environment, probe: SpecConfigurationProbe, workspaceRoot: string): Promise<SpecConfiguration["auth"]> {
  if (env.SPEC_PROVIDER !== "codex") {
    const ref = env.SPEC_PROVIDER_ACCOUNT_REF?.trim();
    if (!ref) throw unconfigured("SPEC_PROVIDER_ACCOUNT_REF");
    return { kind: "provider_secret", ref };
  }
  const home = env.SPEC_CODEX_HOME?.trim();
  if (!home || !isAbsolute(home) || resolve(home) !== home) throw unconfigured("SPEC_CODEX_HOME");
  const withinWorkspace = relative(workspaceRoot, home);
  if (!withinWorkspace || (!withinWorkspace.startsWith("..") && !isAbsolute(withinWorkspace))) throw unconfigured("SPEC_CODEX_HOME");
  if (!(await probe.codexChatGptLoginReady(home))) throw unconfigured("SPEC_CODEX_HOME");
  return { kind: "codex_chatgpt", home };
}

function assertPins(value: (setting: string) => string, computedBundleDigest: string) {
  if (!SHA256_PATTERN.test(value("SPEC_COMPOZY_BINARY_SHA256")) || value("SPEC_COMPOZY_BINARY_SHA256") !== COMPOZY_PIN.binarySha256) throw incompatible("SPEC_COMPOZY_BINARY_SHA256");
  if (value("SPEC_COMPOZY_OPENAPI_SHA256") !== COMPOZY_PIN.openApiSha256) throw incompatible("SPEC_COMPOZY_OPENAPI_SHA256");
  if (value("SPEC_BUNDLE_SHA256") !== computedBundleDigest) throw incompatible("SPEC_BUNDLE_SHA256");
}
