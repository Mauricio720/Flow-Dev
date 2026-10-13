import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import { LocalCommandJournal } from "./localCommandJournal";
import { LocalNativeCommandAgent } from "./localNativeCommandAgent";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

it("settles cancellation when a journaled run cannot be recovered", async () => {
  const directory = await mkdtemp(join(tmpdir(), "flow-cancel-recovery-"));
  directories.push(directory);
  const runId = "11111111-1111-4111-8111-111111111111";
  const machineId = "22222222-2222-4222-8222-222222222222";
  const target = { machineId, linkId: "33333333-3333-4333-8333-333333333333", linkRevision: 1, checkoutHandle: "missing-checkout" };
  const base = { protocolVersion: 1 as const, machineId, projectId: "44444444-4444-4444-8444-444444444444", runId, actorId: "55555555-5555-4555-8555-555555555555", leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target };
  const startPayload = { preparationId: "66666666-6666-4666-8666-666666666666", actionId: "action-1", taskId: "77777777-7777-4777-8777-777777777777", snapshot: { kind: "create_spec" }, task: { issueNumber: 1, title: "Task", bodyMarkdown: "" } };
  const start = { ...base, commandId: "88888888-8888-4888-8888-888888888888", fence: 1, kind: "start" as const, payload: startPayload, payloadHash: localPayloadHash(startPayload) };
  const cancelPayload = { requestKey: "99999999-9999-4999-8999-999999999999" };
  const cancel = { ...base, commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", fence: 2, kind: "cancel" as const, payload: cancelPayload, payloadHash: localPayloadHash(cancelPayload) };
  const journal = new LocalCommandJournal(join(directory, "journal.json"));
  await journal.dispatch(start, async () => "session-1");
  await journal.dispatch(cancel, async () => "cancel-1");
  const accepted = { runtimeExecutionId: "session-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
  await journal.recordEvent({ protocolVersion: 1, commandId: start.commandId, runId, fence: 1, sequence: 1, kind: "accepted", payload: accepted, payloadHash: localPayloadHash(accepted) });
  const store = { read: async () => { throw new Error("checkout unavailable"); } } as never;
  const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(directory, "runtime") });
  const events = await agent.handle(cancel, journal);
  expect(events.map((event) => ({ kind: event.kind, commandId: event.commandId, sequence: event.sequence, outcome: event.kind === "terminal" ? event.payload.outcome : null }))).toEqual([
    { kind: "terminal", commandId: start.commandId, sequence: 2, outcome: "canceled" },
    { kind: "terminal", commandId: cancel.commandId, sequence: 1, outcome: "canceled" },
  ]);
  for (const event of events) await journal.recordEvent(event);
  expect(await journal.activeCommands()).toEqual([]);
});
