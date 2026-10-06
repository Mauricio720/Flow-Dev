import { describe, expect, it } from "vitest";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { COMPOZY_PIN } from "../../application/spec/specPins";
import { buildContainerArguments } from "./containerPlan";
import { EnvironmentSpecAdmission } from "./environmentAdmission";
import { codexChatGptLoginReady } from "./specCodexAuth";
import { loadSpecConfiguration, type SpecConfigurationProbe } from "./specConfiguration";

const BUNDLE_DIGEST = "e".repeat(64);
const environment = () => ({ SPEC_ENABLED: "true", SPEC_RUNNER_ID: "runner-1", SPEC_WORKSPACE_ROOT: "/srv/spec", SPEC_RUNTIME_IMAGE: `registry.example/flow-spec@sha256:${"c".repeat(64)}`, SPEC_PROVIDER: "codex", SPEC_MODEL: "gpt-5.6-sol", SPEC_CODEX_HOME: "/srv/spec-codex-auth", SPEC_DOCS_PROXY_URL: "https://docs-proxy.example", SPEC_COMPOZY_BINARY_SHA256: COMPOZY_PIN.binarySha256, SPEC_COMPOZY_OPENAPI_SHA256: COMPOZY_PIN.openApiSha256, SPEC_BUNDLE_SHA256: BUNDLE_DIGEST, DATABASE_URL: "postgres://x", GITHUB_REPOSITORY_TOKEN_KEY: "k", GITHUB_REPOSITORY_CLIENT_ID: "i", GITHUB_REPOSITORY_CLIENT_SECRET: "s" });
const probe = (ready = true): SpecConfigurationProbe => ({ directoryWritable: async () => true, bundleDigest: async () => BUNDLE_DIGEST, isolationEnforceable: async () => true, codexChatGptLoginReady: async () => ready });

describe("Codex ChatGPT subscription authentication", () => {
  it("accepts a dedicated authenticated home without an API-key secret", async () => {
    const config = await loadSpecConfiguration(environment(), probe());
    expect(config.auth).toEqual({ kind: "codex_chatgpt", home: "/srv/spec-codex-auth" });
    await expect(new EnvironmentSpecAdmission(environment(), async () => BUNDLE_DIGEST).assertReady()).resolves.toBeUndefined();
    const plan = buildContainerArguments({ configuration: config, attemptId: "a1", snapshotPath: "/s/snap", inputsPath: "/s/in", candidatePath: "/s/cand", scratchPath: "/s/scratch", socketDirectory: "/s/sock" });
    expect(plan).toContain("type=bind,source=/srv/spec-codex-auth,target=/run/codex-home,rw");
    expect(plan).toContain("CODEX_HOME=/run/codex-home");
    expect(plan).not.toContain("--secret");
    expect(plan.join(" ")).not.toContain(join(homedir(), ".codex"));
  });

  it("rejects missing, workspace-local, and unauthenticated Codex homes", async () => {
    await expect(loadSpecConfiguration({ ...environment(), SPEC_CODEX_HOME: "" }, probe())).rejects.toMatchObject({ setting: "SPEC_CODEX_HOME" });
    await expect(loadSpecConfiguration({ ...environment(), SPEC_CODEX_HOME: "/srv/spec/auth" }, probe())).rejects.toMatchObject({ setting: "SPEC_CODEX_HOME" });
    await expect(loadSpecConfiguration(environment(), probe(false))).rejects.toMatchObject({ setting: "SPEC_CODEX_HOME" });
    await expect(new EnvironmentSpecAdmission({ ...environment(), SPEC_CODEX_HOME: "" }, async () => BUNDLE_DIGEST).assertReady()).rejects.toMatchObject({ reason: "runtime_unconfigured" });
  });

  it("never accepts the operator's default Codex home", async () => {
    expect(await codexChatGptLoginReady(join(homedir(), ".codex"))).toBe(false);
  });

  it("requires an owner-only directory and credential file", async () => {
    const home = await mkdtemp(join(tmpdir(), "flow-spec-codex-"));
    const authFile = join(home, "auth.json");
    try {
      await writeFile(authFile, "{}", { mode: 0o600 });
      expect(await codexChatGptLoginReady(home, async () => true)).toBe(true);
      await chmod(authFile, 0o644);
      expect(await codexChatGptLoginReady(home, async () => true)).toBe(false);
      await chmod(authFile, 0o600);
      await chmod(home, 0o755);
      expect(await codexChatGptLoginReady(home, async () => true)).toBe(false);
    } finally { await rm(home, { recursive: true, force: true }); }
  });
});
