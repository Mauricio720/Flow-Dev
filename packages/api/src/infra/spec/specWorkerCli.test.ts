import { describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runSpecWorkerCli } from "../../cli/specWorkerMain";
import { COMPOZY_PIN } from "../../application/spec/specPins";
import { buildContainerArguments } from "./containerPlan";
import { PodmanRuntimeLauncher } from "./podmanLauncher";
import { loadSpecConfiguration, type SpecConfigurationProbe } from "./specConfiguration";

const BUNDLE_DIGEST = "e".repeat(64);
const probe = (overrides: Partial<SpecConfigurationProbe> = {}): SpecConfigurationProbe => ({ directoryWritable: async () => true, bundleDigest: async () => BUNDLE_DIGEST, isolationEnforceable: async () => true, codexChatGptLoginReady: async () => true, ...overrides });
const validEnvironment = () => ({ SPEC_ENABLED: "true", SPEC_RUNNER_ID: "runner-1", SPEC_WORKSPACE_ROOT: "/srv/spec", SPEC_RUNTIME_IMAGE: `registry.example/flow-spec@sha256:${"c".repeat(64)}`, SPEC_PROVIDER: "anthropic", SPEC_MODEL: "model-a", SPEC_PROVIDER_ACCOUNT_REF: "flow-spec-account", SPEC_DOCS_PROXY_URL: "https://docs-proxy.example", SPEC_COMPOZY_BINARY_SHA256: COMPOZY_PIN.binarySha256, SPEC_COMPOZY_OPENAPI_SHA256: COMPOZY_PIN.openApiSha256, SPEC_BUNDLE_SHA256: BUNDLE_DIGEST, DATABASE_URL: "postgres://x", GITHUB_REPOSITORY_TOKEN_KEY: "k", GITHUB_REPOSITORY_CLIENT_ID: "i", GITHUB_REPOSITORY_CLIENT_SECRET: "s" });
const rejected = (environment: Record<string, string | undefined>, overrides?: Partial<SpecConfigurationProbe>) => loadSpecConfiguration(environment, probe(overrides)).then(() => null, (error: { reason: string; setting: string }) => ({ reason: error.reason, setting: error.setting }));

describe("spec worker configuration", () => {
  it("UT-081 accepts a complete runner configuration and only its supported mode", async () => {
    const start = vi.fn(async () => undefined);
    const log = vi.fn();
    expect(await runSpecWorkerCli({ argv: [], env: validEnvironment(), deps: { probe: probe(), start, log } })).toBe(0);
    expect(await runSpecWorkerCli({ argv: ["run"], env: validEnvironment(), deps: { probe: probe(), start, log } })).toBe(0);
    expect(start).toHaveBeenCalledTimes(2);
    expect(await runSpecWorkerCli({ argv: ["migrate"], env: validEnvironment(), deps: { probe: probe(), start, log } })).toBe(2);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("UT-082 and IT-239 exit nonzero before claiming work when the workspace root is missing or unusable", async () => {
    for (const environment of [{ ...validEnvironment(), SPEC_WORKSPACE_ROOT: undefined }, { ...validEnvironment(), SPEC_WORKSPACE_ROOT: "relative/path" }]) {
      const start = vi.fn();
      const log = vi.fn();
      expect(await runSpecWorkerCli({ argv: [], env: environment, deps: { probe: probe(), start, log } })).toBe(1);
      expect(start).not.toHaveBeenCalled();
      expect(JSON.parse(log.mock.calls[0]![0])).toEqual({ event: "spec.worker.config_rejected", reason: "runtime_unconfigured", setting: "SPEC_WORKSPACE_ROOT" });
    }
    const start = vi.fn();
    expect(await runSpecWorkerCli({ argv: [], env: validEnvironment(), deps: { probe: probe({ directoryWritable: async () => false }), start, log: vi.fn() } })).toBe(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("refuses digest mismatches, missing credentials, browser-exposed settings and unenforceable isolation", async () => {
    expect(await rejected({ ...validEnvironment(), SPEC_COMPOZY_BINARY_SHA256: "d".repeat(64) })).toEqual({ reason: "runtime_incompatible", setting: "SPEC_COMPOZY_BINARY_SHA256" });
    expect(await rejected({ ...validEnvironment(), SPEC_COMPOZY_OPENAPI_SHA256: "d".repeat(64) })).toMatchObject({ reason: "runtime_incompatible" });
    expect(await rejected({ ...validEnvironment(), SPEC_BUNDLE_SHA256: "d".repeat(64) })).toEqual({ reason: "runtime_incompatible", setting: "SPEC_BUNDLE_SHA256" });
    expect(await rejected({ ...validEnvironment(), SPEC_PROVIDER_ACCOUNT_REF: "" })).toEqual({ reason: "runtime_unconfigured", setting: "SPEC_PROVIDER_ACCOUNT_REF" });
    expect(await rejected({ ...validEnvironment(), SPEC_RUNTIME_IMAGE: "registry.example/flow-spec:latest" })).toEqual({ reason: "runtime_unconfigured", setting: "SPEC_RUNTIME_IMAGE" });
    expect(await rejected({ ...validEnvironment(), NEXT_PUBLIC_SPEC_MODEL: "x" })).toMatchObject({ reason: "runtime_incompatible" });
    expect(await rejected({ ...validEnvironment(), SPEC_ENABLED: "false" })).toEqual({ reason: "runtime_unconfigured", setting: "SPEC_ENABLED" });
    expect(await rejected(validEnvironment(), { isolationEnforceable: async () => false })).toEqual({ reason: "runtime_unconfigured", setting: "SPEC_ISOLATION" });
    expect(await rejected({ ...validEnvironment(), DATABASE_URL: undefined })).toEqual({ reason: "runtime_unconfigured", setting: "DATABASE_URL" });
  });

  it("IT-239 exits nonzero from the real process before opening a database connection", async () => {
    const run = promisify(execFile);
    const failure = await run("npx", ["tsx", "src/cli/specWorker.ts"], { env: { PATH: process.env.PATH, SPEC_ENABLED: "true", SPEC_WORKSPACE_ROOT: "/definitely/missing/root", DATABASE_URL: "postgres://user:topsecret@127.0.0.1:1/none" } }).then(() => null, (error: { code: number; stderr: string }) => error);
    expect(failure?.code).toBe(1);
    expect(failure?.stderr).toContain("spec.worker.config_rejected");
    expect(failure?.stderr).not.toContain("topsecret");
  }, 30_000);
});

describe("container isolation plan", () => {
  const configuration = { runnerId: "r", workspaceRoot: "/srv/spec", runtimeRoot: "/srv/spec/.runtime", runtimeImage: `img@sha256:${"c".repeat(64)}`, provider: "anthropic", model: "m", auth: { kind: "provider_secret" as const, ref: "account-ref" }, docsProxyUrl: "https://docs.example", agentName: "flow-spec", declaredPins: { version: "v", openApiSha256: "o", binarySha256: "b", bundleSha256: "d" } };
  const plan = buildContainerArguments({ configuration, attemptId: "a1", snapshotPath: "/s/snap", inputsPath: "/s/in", candidatePath: "/s/cand", scratchPath: "/s/scratch", socketDirectory: "/s/sock" });

  it("runs rootless, read-only, capability-free and resource-limited with only intended mounts", () => {
    for (const flag of ["--read-only", "--cap-drop=all", "--security-opt=no-new-privileges", "--cpus=2", "--memory=4g", "--pids-limit=256"]) expect(plan).toContain(flag);
    expect(plan).not.toContain("--rootless=true");
    const mounts = plan.filter((_, index) => plan[index - 1] === "--mount");
    expect(mounts).toEqual(expect.arrayContaining(["type=bind,source=/s/snap,target=/workspace/repository,ro", "type=bind,source=/s/in,target=/workspace/inputs,ro", "type=bind,source=/s/cand,target=/workspace/candidate,rw"]));
    expect(mounts.filter((mount) => mount.endsWith(",rw"))).toHaveLength(3);
    expect(plan.join(" ")).not.toMatch(/\.sock\b.*docker|podman\.sock|\/home|\/root|--privileged|--network=host/);
    expect(plan.at(-1)).toBe(configuration.runtimeImage);
  });

  it("passes the provider account as a secret reference and never as a value", () => {
    expect(plan).toContain("account-ref,type=env,target=SPEC_PROVIDER_CREDENTIAL");
    expect(plan.some((argument) => argument.startsWith("SPEC_PROVIDER_CREDENTIAL="))).toBe(false);
  });

  it("starts and stops through argument-array commands only", async () => {
    const calls: { command: string; args: string[] }[] = [];
    const runner = async (command: string, args: string[]) => { calls.push({ command, args }); };
    const launcher = new PodmanRuntimeLauncher(configuration, runner);
    const stopped = launcher.stop("a1");
    await stopped;
    expect(calls).toEqual([{ command: "podman", args: ["rm", "--force", "--ignore", "flow-spec-a1"] }]);
    expect(launcher.socketPath("a1")).toBe("/srv/spec/.runtime/a1/daemon.sock");
  });
});
