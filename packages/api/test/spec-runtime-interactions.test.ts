import { afterEach, describe, expect, it } from "vitest";
import { CompozyRuntimeGateway } from "../src/infra/spec/compozy/compozyRuntimeGateway";
import { startDaemon } from "./spec-daemon";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((close) => close())); });

const permission = { interaction_id: "i1", provider_request_id: "pr1", kind: "permission", status: "pending", turn_id: "turn-1", title: "Escrever _techspec.md", tool_id: "write", decisions: ["allow_once", "allow_always", "reject_once"] };

async function started(overrides = {}) {
  const daemon = await startDaemon(overrides);
  closers.push(daemon.close);
  const gateway = new CompozyRuntimeGateway();
  const created = await gateway.create({ socketPath: daemon.socketPath, workspaceRoot: "/srv/w1", workspaceName: "flow-1", agentName: "flow-spec", sessionName: "attempt-1" });
  daemon.state.sessions[0]!.pending = [permission];
  return { ...daemon, gateway, identity: { socketPath: daemon.socketPath, workspaceId: created.workspaceId, sessionId: created.sessionId } };
}

const allow = (identity: Awaited<ReturnType<typeof started>>["identity"]) => ({ ...identity, kind: "permission" as const, requestId: "pr1", turnId: "turn-1", decision: "allow_once" as const });

describe("runtime interactions", () => {
  it("lists pending permission interactions with their target description", async () => {
    const { gateway, identity } = await started();
    expect(await gateway.interactions(identity)).toEqual([expect.objectContaining({ id: "i1", kind: "permission", title: "Escrever _techspec.md", toolId: "write" })]);
  });

  it("UT-018 maps a malformed permission response to unknown instead of applied", async () => {
    const { gateway, identity, state } = await started();
    state.approveBody = { unexpected: true };
    const result = await gateway.resolve(allow(identity));
    expect(result).toMatchObject({ outcome: "unknown", delivered: false, reason: "outcome_unknown" });
  });

  it("applies a one-time allow and never offers a broader grant", async () => {
    const { gateway, identity, state } = await started();
    state.approveBody = { decision: "allow_once", outcome: "applied", request_id: "pr1" };
    expect(await gateway.resolve(allow(identity))).toMatchObject({ outcome: "applied", delivered: true, liveDeliveryProven: true });
    state.sessions[0]!.pending = [{ ...permission, decisions: ["allow_always"] }];
    expect(await gateway.resolve(allow(identity))).toMatchObject({ outcome: "rejected", delivered: false });
  });

  it("IT-043 keeps queue-full permissions pending with interaction_queue_full", async () => {
    const { gateway, identity, state } = await started();
    state.approveBody = { decision: "allow_once", outcome: "queue-full", request_id: "pr1" };
    expect(await gateway.resolve(allow(identity))).toMatchObject({ outcome: "queue_full", delivered: false, reason: "interaction_queue_full" });
    state.answerStatus = 413;
    const answer = await gateway.resolve({ ...identity, kind: "question", requestId: "q1", choiceIndex: 0 });
    expect(answer).toMatchObject({ outcome: "queue_full", reason: "interaction_queue_full" });
  });

  it("IT-036 and IT-046 distinguish historical resolution from live delivery after a restart", async () => {
    const { gateway, identity, state } = await started();
    state.approveBody = { decision: "allow_once", outcome: "resolved-after-restart", request_id: "pr1" };
    const result = await gateway.resolve(allow(identity));
    expect(result).toMatchObject({ outcome: "resolved_after_restart", delivered: false, liveDeliveryProven: false, orphaned: true });
  });

  it("IT-208 queries the recorded interaction before claiming live delivery of an answer", async () => {
    const { gateway, identity, state } = await started();
    state.sessions[0]!.pending = [{ interaction_id: "i2", provider_request_id: "q1", kind: "clarification", status: "pending", turn_id: "turn-1", title: "Prazo?", choices: ["Thirty days", "Ninety days"] }];
    const proven = await gateway.resolve({ ...identity, kind: "question", requestId: "q1", text: "Ninety days" });
    expect(proven).toMatchObject({ outcome: "answered", delivered: true, winningValue: "Ninety days" });
    expect(state.requests.at(-1)).toMatch(/interactions$/);
    state.sessions[0]!.pending = [{ interaction_id: "i3", provider_request_id: "q2", kind: "clarification", status: "pending", turn_id: "turn-1", title: "Outro?" }];
    state.answerResolves = false;
    expect(await gateway.resolve({ ...identity, kind: "question", requestId: "q2", text: "x" })).toMatchObject({ outcome: "unknown", delivered: false });
  });

  it("IT-211 keeps a 202 stop as stopping until it is verified", async () => {
    const { gateway, identity } = await started();
    expect(await gateway.stop(identity)).toMatchObject({ state: "stopping", verified: false, settled: false, canceled: false });
    const snapshot = await gateway.inspect(identity);
    expect(snapshot).toMatchObject({ state: "active", verified: false });
  });

  it("IT-212 confirms a verified user cancellation exactly when the runtime proves it", async () => {
    const { gateway, identity, state } = await started();
    await gateway.stop(identity);
    Object.assign(state.sessions[0]!, { state: "stopped", verified: true, stop_reason: "user_canceled" });
    const snapshot = await gateway.inspect(identity);
    expect(snapshot).toMatchObject({ state: "stopped", verified: true, stopReason: "user_canceled" });
  });

  it("IT-213 raises outcome_unknown when the session disappears after an accepted stop", async () => {
    const { gateway, identity, state } = await started();
    await gateway.stop(identity);
    state.sessionStatus = 404;
    const failure = await gateway.inspect(identity).then(() => null, (error: { reason?: string; uncertain?: boolean }) => error);
    expect(failure).toMatchObject({ reason: "outcome_unknown", uncertain: true });
  });
});
