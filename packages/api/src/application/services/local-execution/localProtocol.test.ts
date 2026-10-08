import { describe, expect, it } from "vitest";
import { validateLocalCommand, validateLocalEvent } from "./localProtocol";

const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000005"];
const hash = "a".repeat(64);

describe("local protocol strict schemas", () => {
  it.each(["prepare", "start", "inspect", "cancel", "answer"] as const)("UT-180 rejects a command without its target link", (kind) => {
    const input = command(kind, payload(kind));
    input.target.linkId = undefined;
    expect(() => validateLocalCommand(input)).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
  });

  it.each(["prepare", "start", "inspect", "cancel", "answer"] as const)("UT-181 rejects a foreign machine target", (kind) => {
    const input = command(kind, payload(kind));
    input.target.machineId = ids[0];
    expect(() => validateLocalCommand(input)).toThrowError(expect.objectContaining({ reason: "command_unavailable" }));
  });

  it.each([["UT-122 and UT-169", "prepare"], ["UT-170", "start"], ["UT-171", "inspect"], ["UT-172", "cancel"], ["UT-173", "answer"]] as const)("%s rejects undeclared absolute paths in command payloads", (_id, kind) => {
    expect(() => validateLocalCommand(command(kind, { ...payload(kind), absolutePath: "/home/private" }))).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
  });

  it.each([["UT-174", "accepted"], ["UT-175", "prepared"], ["UT-176", "activity"], ["UT-177", "gate"], ["UT-178", "terminal"]] as const)("%s rejects undeclared absolute paths", (_id, kind) => {
    expect(() => validateLocalEvent(event(kind, { ...eventPayload(kind), absolutePath: "/home/private" }))).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
  });

  it("UT-179 maps unknown protocol versions to protocol_incompatible", () => {
    expect(() => validateLocalCommand({ ...command("prepare", payload("prepare")), protocolVersion: 99 })).toThrowError(expect.objectContaining({ reason: "protocol_incompatible" }));
  });
});

function command(kind: "prepare" | "start" | "inspect" | "cancel" | "answer", body: Record<string, unknown>) {
  return { protocolVersion: 1, commandId: ids[0], machineId: ids[1], projectId: ids[2], runId: ids[3], actorId: ids[4], fence: 3, leaseExpiresAt: "2026-10-07T11:01:00.000Z", target: { machineId: ids[1], linkId: ids[4], linkRevision: 2, checkoutHandle: "checkout-opaque" }, payloadHash: hash, kind, payload: body };
}

function payload(kind: "prepare" | "start" | "inspect" | "cancel" | "answer"): Record<string, unknown> {
  if (kind === "prepare") return { preparationId: ids[3], actionId: "plan", sourceSnapshotId: ids[2], checkoutLabel: "Checkout", action: { kind: "create_spec" } };
  if (kind === "start") return { preparationId: ids[3], actionId: "plan", taskId: ids[2], snapshot: { action: "plan" }, task: { issueNumber: 42, title: "Task", bodyMarkdown: "Details" } };
  if (kind === "cancel") return { requestKey: ids[2] };
  if (kind === "answer") return { interactionId: ids[3], answer: "continue" };
  return {};
}

function event(kind: "accepted" | "prepared" | "activity" | "gate" | "terminal", body: Record<string, unknown>) {
  return { protocolVersion: 1, commandId: ids[0], runId: ids[3], fence: 3, sequence: 1, payloadHash: hash, kind, payload: body };
}

function eventPayload(kind: "accepted" | "prepared" | "activity" | "gate" | "terminal"): Record<string, unknown> {
  if (kind === "accepted") return { runtimeExecutionId: "exec-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
  if (kind === "prepared") return { preparationId: ids[3], checkoutLabel: "Checkout", dirty: false, checkoutDigest: hash, manifestHash: hash, capabilities: ["native"], requiredGates: [] };
  if (kind === "activity") return { summary: "Updated a source file", relativeFiles: ["src/index.ts"] };
  if (kind === "gate") return { gateId: "lint", attempt: 1, manifestHash: hash, commandDigest: hash, checkedCheckoutDigest: hash, state: "passed", reason: null, evidenceHash: hash, exitCode: 0, executionId: "gate-1", startedAt: "2026-10-07T12:00:00.000Z", finishedAt: "2026-10-07T12:00:01.000Z" };
  return { outcome: "succeeded", reason: null, checkoutDigest: hash, artifactsSafe: true, runtimeSucceeded: true };
}
