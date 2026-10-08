import { describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { PinnedCompozyControlGateway } from "./compozyControlGateway";
import type { CompozyTransport } from "./compozyTransport";

const PROVIDER = "codex";
const identity = (version: string = COMPOZY_PIN.version) => ({ status: 200, body: { daemon: { version }, schema_version: "1" } });
const row = (overrides: Record<string, unknown>) => ({
  provider_id: PROVIDER,
  model_id: "gpt-5.6-sol",
  availability_state: "available_live",
  reasoning_efforts: ["low", "high"],
  ...overrides,
});

function gatewayFor(models: unknown, version?: string, openApi: string = COMPOZY_PIN.openApiSha256) {
  const transport: CompozyTransport = async ({ path }) => {
    if (path === "/api/status/identity") return identity(version);
    return { status: 200, body: models };
  };
  return new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: openApi });
}

describe("pinned compozy control gateway", () => {
  it("UT-008 marks a stale catalog row unselectable", async () => {
    const result = await gatewayFor({ models: [row({ availability_state: "available_stale" })] }).listModels(PROVIDER);
    expect(result).toMatchObject({ ok: true, release: COMPOZY_PIN.release });
    if (!result.ok) return;
    expect(result.value[0]).toMatchObject({ selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] });
  });

  it("UT-009 offers exactly the advertised efforts plus provider default", async () => {
    const result = await gatewayFor({ models: [row({})] }).listModels(PROVIDER);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value[0]?.reasoningChoices).toEqual([null, "low", "high"]);
  });

  it("UT-010 rejects an effort outside the advertised set", async () => {
    const gateway = gatewayFor({ models: [row({})] });
    const result = await gateway.validateChoice(PROVIDER, { modelId: "gpt-5.6-sol", reasoningEffort: "medium" });
    expect(result).toMatchObject({ ok: false, code: "reasoning_effort_unsupported" });
    const accepted = await gateway.validateChoice(PROVIDER, { modelId: "gpt-5.6-sol", reasoningEffort: null });
    expect(accepted.ok).toBe(true);
  });

  it("IT-087 offers only provider default when no efforts are advertised", async () => {
    const result = await gatewayFor({ models: [row({ reasoning_efforts: null })] }).listModels(PROVIDER);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value[0]?.reasoningChoices).toEqual([null]);
  });

  it("fails closed on version drift, digest drift and malformed bodies", async () => {
    const drifted = await gatewayFor({ models: [] }, "0.3.0-beta.30").listModels(PROVIDER);
    expect(drifted).toMatchObject({ ok: false, code: "runtime_incompatible" });
    const digest = await gatewayFor({ models: [] }, undefined, "f".repeat(64)).listModels(PROVIDER);
    expect(digest).toMatchObject({ ok: false, code: "runtime_incompatible" });
    const malformed = await gatewayFor({ models: [{ model_id: 1 }] }).listModels(PROVIDER);
    expect(malformed).toMatchObject({ ok: false, code: "runtime_incompatible" });
  });

  it("maps probe and transport failures to bounded codes", async () => {
    const unauthorized: CompozyTransport = async ({ path }) =>
      path === "/api/status/identity" ? identity() : { status: 401, body: { secret: "token" } };
    const probe = await new PinnedCompozyControlGateway({ transport: unauthorized, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 }).probeProvider(PROVIDER);
    expect(probe).toEqual({ ok: false, code: "auth_required", release: COMPOZY_PIN.release });
    const offline: CompozyTransport = async () => { throw new Error("socket closed"); };
    const down = await new PinnedCompozyControlGateway({ transport: offline, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 }).listModels(PROVIDER);
    expect(down).toMatchObject({ ok: false, code: "service_unavailable" });
  });

  it("reads the pinned auth_status probe shape", async () => {
    const result = await gatewayFor({ provider: "codex", auth_status: { state: "authenticated" } }).probeProvider(PROVIDER);
    expect(result).toMatchObject({ ok: true, value: { providerId: PROVIDER, authenticated: true } });
  });

  it("registers a local workspace idempotently after an existing-path conflict", async () => {
    const transport: CompozyTransport = async ({ path, method }) => {
      if (path === "/api/status/identity") return identity();
      if (path === "/api/workspaces" && method === "POST") return { status: 409, body: {} };
      return { status: 200, body: { workspaces: [{ id: "ws-local", root_dir: "/projects/repo", name: "repo" }] } };
    };
    const gateway = new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 });
    await expect(gateway.registerWorkspace({ rootDir: "/projects/repo", name: "flow-local" })).resolves.toMatchObject({ ok: true, value: "ws-local" });
  });
});
