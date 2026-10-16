import { describe, expect, it, vi } from "vitest";
import type { IssueDeletionDao } from "../../database/dao/issueDeletionDao";
import type { DeletionOperation } from "./issueDeletionContracts";
import { IssueDeletionError } from "./issueDeletionErrors";
import { IssueDeletionWorker } from "./issueDeletionWorker";
import type { DeletionAccess, DeletionProvider } from "./deletionPorts";

const now = new Date("2026-10-13T12:00:00.000Z");

function operation(overrides: Partial<DeletionOperation> = {}): DeletionOperation {
  return {
    id: crypto.randomUUID(), projectId: "p1", taskId: null, repositoryId: "202", repositoryNodeId: "R_202",
    issueNodeId: "I_41", issueNumber: 41, initiatorUserId: "u1", requestKey: crypto.randomUUID(),
    state: "stopping", remotePresence: "unknown", workStopped: false, reason: null, retryAt: null,
    leaseOwner: null, leaseFence: 1, leaseUntil: null, createdAt: now, updatedAt: now, completedAt: null,
    ...overrides,
  };
}

class FakeDao {
  operations = new Map<string, DeletionOperation>();
  patches: { operationId: string; fence: number; patch: Record<string, unknown> }[] = [];
  claimable = true;
  staleFence = false;

  constructor(seed: DeletionOperation[] = []) { for (const op of seed) this.operations.set(op.id, op); }

  claimNext = vi.fn(async () => {
    if (!this.claimable) return null;
    const op = [...this.operations.values()].find((candidate) => !["completed", "recoverable"].includes(candidate.state) && (!candidate.retryAt || candidate.retryAt <= now));
    if (!op) return null;
    if (this.staleFence) return { operation: op, workerId: "worker", fence: op.leaseFence - 1 };
    const fence = op.leaseFence + 1;
    this.operations.set(op.id, { ...op, leaseOwner: "worker", leaseFence: fence, leaseUntil: new Date(now.getTime() + 60_000) });
    return { operation: this.operations.get(op.id)!, workerId: "worker", fence };
  });

  async byId(id: string) { return this.operations.get(id) ?? null; }
  async patch(input: { operationId: string; fence: number; patch: Record<string, unknown> }) {
    this.patches.push(input);
    const op = this.operations.get(input.operationId)!;
    if (op.leaseFence !== input.fence) throw new IssueDeletionError("stale_fence");
    this.operations.set(op.id, { ...op, ...input.patch } as DeletionOperation);
  }
  async heartbeat() {}
  publicationState: () => Promise<{ unresolved: boolean; createdIdentity: { repositoryId: string; repositoryNodeId: string; issueNodeId: string; issueNumber: number } | null }> = async () => ({ unresolved: false, createdIdentity: null });
  async taskFacts() { return null; }
  async adoptIdentity(input: { operationId: string; identity: { issueNodeId: string; issueNumber: number; repositoryId: string; repositoryNodeId: string } }) {
    const op = this.operations.get(input.operationId)!;
    this.operations.set(op.id, { ...op, issueNodeId: input.identity.issueNodeId, issueNumber: input.identity.issueNumber, repositoryId: input.identity.repositoryId, repositoryNodeId: input.identity.repositoryNodeId });
  }
  async purgeTaskAndComplete(input: { operationId: string; fence: number }) {
    const op = this.operations.get(input.operationId)!;
    if (op.leaseFence !== input.fence) throw new IssueDeletionError("stale_fence");
    this.operations.set(op.id, { ...op, state: "completed", completedAt: now });
  }
  async completeQueueOnly(input: { operationId: string; fence: number }) {
    const op = this.operations.get(input.operationId)!;
    if (op.leaseFence !== input.fence) throw new IssueDeletionError("stale_fence");
    this.operations.set(op.id, { ...op, state: "completed", completedAt: now });
  }
}

function deps(dao: FakeDao, providerOverride: Partial<DeletionProvider> = {}, accessOverride: Partial<DeletionAccess> = {}, stopOverride: Record<string, unknown> = {}) {
  const stop = { stopTask: vi.fn(async () => ({ workStopped: true, reason: null })), ...stopOverride };
  const access: DeletionAccess = {
    requireProject: vi.fn(async () => ({ repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" })),
    isAdmin: vi.fn(async () => false),
    githubIdentity: vi.fn(async () => null),
    personalContext: vi.fn(async () => ({ kind: "ok" as const, token: "token", githubUserId: "1001", repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" })),
    ...accessOverride,
  };
  const provider: DeletionProvider = {
    tokenFor: vi.fn(async () => "token"),
    inspect: vi.fn(async () => ({ ok: true as const, value: { nodeId: "I_41", number: 41, title: "Issue 41", repositoryId: "202", repositoryNodeId: "R_202", repositoryOwner: "acme", repositoryName: "private", authorDatabaseId: "1001", viewerCanDelete: true } })),
    remove: vi.fn(async () => ({ ok: true as const, value: "accepted" as const })),
    absence: vi.fn(async () => ({ ok: true as const, value: "absent" as const })),
    ...providerOverride,
  };
  const worker = new IssueDeletionWorker({ dao: dao as unknown as IssueDeletionDao, access, provider, stop: stop as never, owner: "worker", clock: () => now, leaseMs: 60_000 });
  return { worker, provider, stop };
}

async function drain(worker: IssueDeletionWorker, limit = 20) {
  for (let index = 0; index < limit; index += 1) {
    if (!(await worker.tick())) break;
  }
}

describe("IssueDeletionWorker", () => {
  it("UT-015 dispatching or uncertain publication blocks local cleanup", async () => {
    const dao = new FakeDao([operation({ taskId: "t1", state: "reconciling", workStopped: true })]);
    dao.publicationState = async () => ({ unresolved: true, createdIdentity: null });
    const { worker } = deps(dao);
    await drain(worker, 3);
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("recoverable");
    expect(op.reason).toBe("uncertain_publication");
  });

  it("UT-016 timed-out mutation verifies absence before any second remove", async () => {
    const dao = new FakeDao([operation({ state: "deleting_remote", remotePresence: "present" })]);
    const remove = vi.fn(async () => ({ ok: false as const, failure: "provider_unavailable" as const }));
    const absence = vi.fn(async () => ({ ok: true as const, value: "absent" as const }));
    const { worker } = deps(dao, { remove, absence });
    await drain(worker, 10);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(absence).toHaveBeenCalledTimes(1);
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("completed");
    expect(op.remotePresence).toBe("absent");
  });

  it("UT-020 429 Retry-After persists a future retry time and prevents immediate retry", async () => {
    const dao = new FakeDao([operation({ state: "deleting_remote", remotePresence: "present" })]);
    const remove = vi.fn(async () => ({ ok: false as const, failure: "provider_rate_limited" as const, retryAfterSeconds: 60 }));
    const { worker } = deps(dao, { remove });
    await drain(worker, 2);
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("recoverable");
    expect(op.reason).toBe("provider_rate_limited");
    expect(op.retryAt).toEqual(new Date(now.getTime() + 60_000));
    expect(remove).toHaveBeenCalledTimes(1);
    const calls = dao.patches.length;
    await drain(worker, 3);
    expect(dao.patches.length).toBe(calls);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("UT-028 stale lease fence cannot settle an operation", async () => {
    const dao = new FakeDao([operation({ state: "cleaning_local", remotePresence: "absent", leaseFence: 3 })]);
    dao.staleFence = true;
    const { worker } = deps(dao);
    await drain(worker, 2);
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("cleaning_local");
    expect(op.state).not.toBe("completed");
    expect(dao.patches.length).toBe(0);
  });

  it("keeps stopped work stopped through recoverable retry resume", async () => {
    const dao = new FakeDao([operation({ taskId: "t1", issueNodeId: null, issueNumber: null, state: "stopping", workStopped: false })]);
    const { worker } = deps(dao);
    await worker.tick();
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("reconciling");
    expect(op.workStopped).toBe(true);
  });

  it("adopts a created publication and deletes the verified Issue before cleanup", async () => {
    const dao = new FakeDao([operation({ taskId: "t1", state: "reconciling", workStopped: true, issueNodeId: null, issueNumber: null })]);
    dao.publicationState = async () => ({ unresolved: false, createdIdentity: { repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_41", issueNumber: 41 } });
    const remove = vi.fn(async () => ({ ok: true as const, value: "accepted" as const }));
    const { worker } = deps(dao, { remove });
    await drain(worker, 20);
    const op = [...dao.operations.values()][0]!;
    expect(op.state).toBe("completed");
    expect(op.issueNodeId).toBe("I_41");
    expect(remove).toHaveBeenCalledOnce();
  });
});
