import { afterEach, describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../src/application/spec/specPins";
import type { RuntimeConfiguration } from "../src/application/spec/specRuntimeGateway";
import { CompozyRuntimeGateway } from "../src/infra/spec/compozy/compozyRuntimeGateway";
import { startDaemon } from "./spec-daemon";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((close) => close())); });

const pins = { version: COMPOZY_PIN.version, openApiSha256: COMPOZY_PIN.openApiSha256, binarySha256: COMPOZY_PIN.binarySha256, bundleSha256: "b".repeat(64) };
const configuration = (socketPath: string, declared = pins): RuntimeConfiguration => ({ socketPath, agentName: "flow-spec", provider: "anthropic", model: "model-a", declared, accepted: pins });
const reason = (promise: Promise<unknown>) => promise.then(() => null, (error: { reason?: string }) => error.reason);

async function daemon(overrides = {}) {
  const started = await startDaemon(overrides);
  closers.push(started.close);
  return { ...started, gateway: new CompozyRuntimeGateway() };
}

async function session(started: Awaited<ReturnType<typeof daemon>>) {
  const created = await started.gateway.create({ socketPath: started.socketPath, workspaceRoot: "/srv/w1", workspaceName: "flow-1", agentName: "flow-spec", sessionName: "attempt-1" });
  return { socketPath: started.socketPath, workspaceId: created.workspaceId, sessionId: created.sessionId };
}

describe("compozy runtime gateway", () => {
  it("IT-119 and IT-231 fail closed on pin drift and permissive permission mode", async () => {
    const started = await daemon();
    expect((await started.gateway.preflight(configuration(started.socketPath))).permissions).toBe("approve-reads");
    expect(await reason(started.gateway.preflight(configuration(started.socketPath, { ...pins, bundleSha256: "c".repeat(64) })))).toBe("runtime_incompatible");
    expect(await reason(started.gateway.preflight(configuration(started.socketPath, { ...pins, binarySha256: "d".repeat(64) })))).toBe("runtime_incompatible");
    started.state.permissions = "approve-all";
    expect(await reason(started.gateway.preflight(configuration(started.socketPath)))).toBe("runtime_incompatible");
    started.state.permissions = "approve-reads";
    started.state.version = "0.3.0-beta.30";
    expect(await reason(started.gateway.preflight(configuration(started.socketPath)))).toBe("runtime_incompatible");
  });

  it("UT-017 maps a queued prompt response to an accepted submission with the saved message ID", async () => {
    const started = await daemon();
    const identity = await session(started);
    const result = await started.gateway.submit({ ...identity, messageId: "m1", idempotencyKey: "k1", message: "go" });
    expect(result).toMatchObject({ status: "accepted", messageId: "m1", idempotencyKey: "k1", turnId: "turn-1" });
  });

  it("IT-201 reconciles a dropped session-create response to its one session", async () => {
    const started = await daemon({ dropNextCreateResponse: true });
    const identity = await session(started);
    expect(identity.sessionId).toBe("s1");
    expect(started.state.sessions).toHaveLength(1);
    expect(started.state.prompts).toHaveLength(0);
  });

  it("IT-202 keeps outcome_unknown when the catalog holds two matching sessions", async () => {
    const started = await daemon({ dropNextCreateResponse: true, duplicateSessions: 1 });
    const failure = await reason(started.gateway.create({ socketPath: started.socketPath, workspaceRoot: "/srv/w1", workspaceName: "flow-1", agentName: "flow-spec", sessionName: "attempt-1" }));
    expect(failure).toBe("outcome_unknown");
    expect(started.state.prompts).toHaveLength(0);
  });

  it("IT-203 reports an indeterminate 409 without inventing new prompt identities", async () => {
    const started = await daemon();
    const identity = await session(started);
    started.state.promptStatus = 409;
    expect(await started.gateway.submit({ ...identity, messageId: "m1", idempotencyKey: "k1", message: "go" })).toMatchObject({ status: "conflict", messageId: "m1", idempotencyKey: "k1" });
    started.state.promptStatus = 413;
    expect((await started.gateway.submit({ ...identity, messageId: "m1", idempotencyKey: "k1", message: "go" })).status).toBe("queue_full");
  });
});
