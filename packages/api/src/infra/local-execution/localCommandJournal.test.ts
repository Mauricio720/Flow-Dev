import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalCommandJournal } from "./localCommandJournal";
import { localPayloadHash } from "../../application/services/local-execution/localHash";

const directories: string[] = [];
const commandId = "00000000-0000-4000-8000-000000000001";
const operationId = "00000000-0000-4000-8000-000000000002";
const machineId = "00000000-0000-4000-8000-000000000003";
const linkId = "00000000-0000-4000-8000-000000000004";
const projectId = "00000000-0000-4000-8000-000000000005";
const hash = "a".repeat(64);

afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("LocalCommandJournal", () => {
  it("UT-123 journals dispatch intent and replays the accepted runtime identity", async () => {
    const journal = await createJournal();
    const submit = vi.fn(async () => "runtime-1");
    await expect(journal.dispatch(prepare(), submit)).resolves.toMatchObject({ replayed: false, runtimeId: "runtime-1", state: "accepted" });
    await expect(journal.dispatch(prepare(), submit)).resolves.toMatchObject({ replayed: true, runtimeId: "runtime-1" });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("UT-124 and UT-183 reject reuse of a command id with a changed payload hash", async () => {
    const journal = await createJournal();
    await journal.dispatch(prepare(), async () => "runtime-1");
    const changedPayload = { preparationId: operationId, actionId: "different", sourceSnapshotId: operationId, checkoutLabel: "Checkout", action: { kind: "create_spec" } };
    await expect(journal.dispatch({ ...prepare(), payload: changedPayload, payloadHash: localPayloadHash(changedPayload) }, async () => "runtime-2")).rejects.toMatchObject({ reason: "command_payload_changed" });
  });

  it("UT-125 asks for a resend when an event sequence has a gap", async () => {
    const journal = await createJournal();
    await journal.dispatch(prepare(), async () => "runtime-1");
    await expect(journal.recordEvent(event(2))).rejects.toMatchObject({ reason: "event_gap" });
  });

  it("UT-126 rejects stale event fences", async () => {
    const journal = await createJournal();
    await journal.dispatch(prepare(), async () => "runtime-1");
    await expect(journal.recordEvent({ ...event(1), fence: 2 })).rejects.toMatchObject({ reason: "stale_fence" });
  });

  it("UT-164 acknowledges an identical event replay and UT-165 rejects a conflicting payload for the same sequence", async () => {
    const journal = await createJournal();
    await journal.dispatch(prepare(), async () => "runtime-1");
    const first = event(1);
    await expect(journal.recordEvent(first)).resolves.toMatchObject({ acknowledgedSequence: 1, replayed: false });
    await expect(journal.recordEvent(first)).resolves.toMatchObject({ acknowledgedSequence: 1, replayed: true });
    const changedPayload = { runtimeExecutionId: "exec-changed", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
    await expect(journal.recordEvent({ ...first, payload: changedPayload, payloadHash: localPayloadHash(changedPayload) })).rejects.toMatchObject({ reason: "event_conflict" });
  });

  it("UT-163 and UT-182 reject an expired command before submitting a native effect", async () => {
    const journal = await createJournal(new Date("2026-10-07T12:00:00.000Z"));
    const submit = vi.fn(async () => "runtime-1");
    await expect(journal.dispatch(prepare(), submit)).rejects.toMatchObject({ reason: "command_expired" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("UT-185 keeps uncertain dispatch unknown and never submits a replacement", async () => {
    const journal = await createJournal();
    const submit = vi.fn(async () => { throw new Error("acknowledgment lost"); });
    await expect(journal.dispatch(prepare(), submit)).resolves.toMatchObject({ state: "unknown", runtimeId: null });
    await expect(journal.dispatch(prepare(), submit)).resolves.toMatchObject({ replayed: true, state: "unknown", runtimeId: null });
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

async function createJournal(now = new Date("2026-10-07T11:00:00.000Z")) {
  const directory = await mkdtemp(join(tmpdir(), "flow-journal-"));
  directories.push(directory);
  return new LocalCommandJournal(join(directory, "journal.json"), () => now);
}

function prepare() {
  const payload = { preparationId: operationId, actionId: "spec-plan", sourceSnapshotId: operationId, checkoutLabel: "Checkout", action: { kind: "create_spec" } };
  return { protocolVersion: 1, commandId, machineId, projectId, runId: operationId, actorId: machineId, fence: 3, leaseExpiresAt: "2026-10-07T11:01:00.000Z", target: { machineId, linkId, linkRevision: 2, checkoutHandle: "checkout-opaque" }, payloadHash: localPayloadHash(payload), kind: "prepare", payload };
}

function event(sequence: number) {
  const payload = { runtimeExecutionId: "exec-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
  return { protocolVersion: 1, commandId, runId: operationId, fence: 3, sequence, payloadHash: localPayloadHash(payload), kind: "accepted", payload: { runtimeExecutionId: "exec-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null } };
}
