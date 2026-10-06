import { COMPOZY_PIN } from "../../application/spec/specPins";
import type { SpecAdmission } from "../../application/spec/specAdmission";
import { TaskError } from "../../application/services/tasks/taskErrors";

const REQUIRED_SETTINGS = ["SPEC_ENABLED", "SPEC_RUNNER_ID", "SPEC_WORKSPACE_ROOT", "SPEC_RUNTIME_IMAGE", "SPEC_PROVIDER", "SPEC_MODEL", "SPEC_DOCS_PROXY_URL", "SPEC_COMPOZY_BINARY_SHA256", "SPEC_COMPOZY_OPENAPI_SHA256", "SPEC_BUNDLE_SHA256"];

export class EnvironmentSpecAdmission implements SpecAdmission {
  constructor(private readonly env: Record<string, string | undefined>, private readonly bundleDigest: () => Promise<string> = defaultBundleDigest) {}

  async assertReady() {
    if (this.env.SPEC_ENABLED !== "true" || REQUIRED_SETTINGS.some((setting) => !this.env[setting]?.trim())) throw new TaskError("runtime_unconfigured");
    const authSetting = this.env.SPEC_PROVIDER === "codex" ? "SPEC_CODEX_HOME" : "SPEC_PROVIDER_ACCOUNT_REF";
    if (!this.env[authSetting]?.trim()) throw new TaskError("runtime_unconfigured");
    const pinsMatch = this.env.SPEC_COMPOZY_BINARY_SHA256 === COMPOZY_PIN.binarySha256 && this.env.SPEC_COMPOZY_OPENAPI_SHA256 === COMPOZY_PIN.openApiSha256;
    if (!pinsMatch || this.env.SPEC_BUNDLE_SHA256 !== await this.bundleDigest()) throw new TaskError("runtime_incompatible");
  }
}

async function defaultBundleDigest() {
  try { return (await (await import("./specBundleLoader")).loadSpecBundle()).digest; }
  catch { throw new TaskError("runtime_incompatible"); }
}
