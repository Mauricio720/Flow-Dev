import { describe, expect, it } from "vitest";
import type { IssueDeletionDao, TaskDeletionFacts } from "../../database/dao/issueDeletionDao";
import type { DeletionOperation, DeletionState } from "./issueDeletionContracts";
import { IssueDeletionError } from "./issueDeletionErrors";
import { IssueDeletionService } from "./issueDeletionService";
import type { DeletionAccess, DeletionProvider, PersonalContext } from "./deletionPorts";
import { taskFingerprint } from "./deletionFingerprint";

const u1 = "10000000-0000-4000-8000-000000000001";
const u2 = "20000000-0000-4000-8000-000000000001";
const admin = "30000000-0000-4000-8000-000000000001";
const p1 = "40000000-0000-4000-8000-000000000001";
const t1 = "50000000-0000-4000-8000-000000000001";
const sessionId = "60000000-0000-4000-8000-000000000001";

function facts(overrides: Partial<TaskDeletionFacts> = {}): TaskDeletionFacts {
  return {
    taskId: t1, projectId: p1, authorUserId: u1, origin: "flow_dev", status: "draft_ready", title: "Draft title",
    repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: null, issueNumber: null,
    publicationOutcomes: [], pendingDeletion: false, ...overrides,
  };
}

class FakeDao implements IssueDeletionDao {
  operations = new Map<string, DeletionOperation>();
  taskFactsMap = new Map<string, TaskDeletionFacts>();
  reserved = 0;
  resumeCalls: { operationId: string; state: string }[] = [];
  patchCalls: { operationId: string; patch: Record<string, unknown> }[] = [];

  constructor(seed: DeletionOperation[] = []) { for (const op of seed) this.operations.set(op.id, op); }

  async reserve(input: Parameters<IssueDeletionDao["reserve"]>[0]) {
    const byKey = [...this.operations.values()].find((op) => op.initiatorUserId === input.initiatorUserId && op.requestKey === input.requestKey);
    if (byKey) return { operation: byKey, created: false };
    const bound = [...this.operations.values()].find((op) => input.reservation.kind === "task" ? op.taskId === input.reservation.taskId : op.issueNodeId === input.reservation.issueNodeId && op.taskId === null);
    if (bound && bound.state !== "completed") return { operation: bound, created: false };
    this.reserved += 1;
    const operation: DeletionOperation = {
      id: crypto.randomUUID(), projectId: input.projectId, taskId: input.reservation.kind === "task" ? input.reservation.taskId : null,
      repositoryId: input.reservation.repositoryId, repositoryNodeId: input.reservation.repositoryNodeId,
      issueNodeId: input.reservation.issueNodeId, issueNumber: input.reservation.issueNumber,
      initiatorUserId: input.initiatorUserId, requestKey: input.requestKey, state: "stopping", remotePresence: input.remotePresence,
      workStopped: false, reason: null, retryAt: null, leaseOwner: null, leaseFence: 0, leaseUntil: null,
      createdAt: new Date(), updatedAt: new Date(), completedAt: null,
    };
    this.operations.set(operation.id, operation);
    return { operation, created: true };
  }
  async byId(id: string) { return this.operations.get(id) ?? null; }
  async byRequestKey(userId: string, requestKey: string) { return [...this.operations.values()].find((op) => op.initiatorUserId === userId && op.requestKey === requestKey) ?? null; }
  async activeForTask(taskId: string) { return [...this.operations.values()].find((op) => op.taskId === taskId && op.state !== "completed") ?? null; }
  async activeForIdentity() { return null; }
  async claimNext() { return null; }
  async heartbeat() {}
  async patch(input: { operationId: string; fence: number; patch: Record<string, unknown> }) {
    this.patchCalls.push({ operationId: input.operationId, patch: input.patch });
    const op = this.operations.get(input.operationId)!;
    this.operations.set(op.id, { ...op, ...input.patch } as DeletionOperation);
  }
  async adoptIdentity() {}
  async purgeTaskAndComplete(input: { operationId: string }) {
    const op = this.operations.get(input.operationId)!;
    this.operations.set(op.id, { ...op, state: "completed", completedAt: new Date() });
  }
  async completeQueueOnly(input: { operationId: string }) {
    const op = this.operations.get(input.operationId)!;
    this.operations.set(op.id, { ...op, state: "completed", completedAt: new Date() });
  }
  async pending() { return [...this.operations.values()]; }
  async activeFenceState() { return null; }
  async taskFacts(projectId: string, taskId: string) { return this.taskFactsMap.get(taskId) ?? null; }
  async cancelTaskWork() { return []; }
  async publicationState(taskId: string) { return { unresolved: false, createdIdentity: null }; }
  async remainingActiveWork() { return { operations: [], runs: [], specs: [], reviewSessions: [] }; }
  async resume(input: { operationId: string; state: DeletionState }) {
    this.resumeCalls.push(input);
    const op = this.operations.get(input.operationId)!;
    if (op.state === "recoverable") {
      this.operations.set(op.id, { ...op, state: input.state, leaseFence: op.leaseFence + 1 });
    }
    return this.operations.get(input.operationId)!;
  }
}

function access(overrides: Partial<DeletionAccess> = {}): DeletionAccess {
  return {
    requireProject: async (actor, projectId) => (projectId === p1 ? { repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" } : null),
    isAdmin: async (actor) => actor.userId === admin,
    githubIdentity: async (userId) => (userId === u1 ? "1001" : null),
    personalContext: async (): Promise<PersonalContext> => ({ kind: "ok", token: "token", githubUserId: "1001", repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" }),
    ...overrides,
  };
}

function provider(overrides: Partial<DeletionProvider> = {}): DeletionProvider {
  return {
    tokenFor: async () => "token",
    inspect: async () => ({ ok: true, value: { nodeId: "I_41", number: 41, title: "Issue 41", repositoryId: "202", repositoryNodeId: "R_202", repositoryOwner: "acme", repositoryName: "private", authorDatabaseId: "1001", viewerCanDelete: true } }),
    remove: async () => ({ ok: true, value: "accepted" as const }),
    absence: async () => ({ ok: true, value: "absent" as const }),
    ...overrides,
  };
}

function service(dao: FakeDao, accessOverride: Partial<DeletionAccess> = {}, providerOverride: Partial<DeletionProvider> = {}) {
  return new IssueDeletionService({ dao, access: access(accessOverride), provider: provider(providerOverride), clock: () => new Date("2026-10-13T12:00:00.000Z") });
}

const startInput = (fingerprint: string, requestKey: string) => ({ target: { kind: "task" as const, projectId: p1, taskId: t1 }, fingerprint, requestKey });

describe("IssueDeletionService", () => {
  it("UT-001 eligible saved-task author receives local preview", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const preview = await svc.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 });
    expect(preview.canDelete).toBe(true);
    expect(preview.destinations).toEqual(["flow_dev"]);
    expect(preview.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("UT-002 ineligible reader sees no capability and cannot start", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const preview = await svc.preview({ userId: u2 }, { kind: "task", projectId: p1, taskId: t1 });
    expect(preview.canDelete).toBe(false);
    await expect(svc.start({ userId: u2, sessionId }, startInput(preview.fingerprint, crypto.randomUUID()))).rejects.toMatchObject({ reason: "forbidden" });
    expect(dao.reserved).toBe(0);
  });

  it("UT-003 changed publication fingerprint blocks start before fencing", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const preview = await svc.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 });
    dao.taskFactsMap.set(t1, facts({ status: "published", issueNodeId: "I_41", issueNumber: 41 }));
    await expect(svc.start({ userId: u1, sessionId }, startInput(preview.fingerprint, crypto.randomUUID()))).rejects.toMatchObject({ reason: "precondition_failed" });
    expect(dao.reserved).toBe(0);
  });

  it("UT-004 same target and request key reuse one operation ID", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const fingerprint = taskFingerprint({ projectId: p1, taskId: t1, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: null, destinations: ["flow_dev"] });
    const requestKey = crypto.randomUUID();
    const first = await svc.start({ userId: u1, sessionId }, startInput(fingerprint, requestKey));
    const second = await svc.start({ userId: u1, sessionId }, startInput(fingerprint, requestKey));
    expect(second.operationId).toBe(first.operationId);
    expect(dao.reserved).toBe(1);
  });

  it("UT-005 retry key bound to another operation conflicts without changing either", async () => {
    const now = new Date();
    const op1: DeletionOperation = { id: crypto.randomUUID(), projectId: p1, taskId: t1, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: null, issueNumber: null, initiatorUserId: u1, requestKey: "a0000000-0000-4000-8000-000000000001", state: "recoverable", remotePresence: "not_applicable", workStopped: true, reason: "unknown_stop", retryAt: null, leaseOwner: null, leaseFence: 0, leaseUntil: null, createdAt: now, updatedAt: now, completedAt: null };
    const op2: DeletionOperation = { ...op1, id: crypto.randomUUID(), requestKey: "b0000000-0000-4000-8000-000000000001" };
    const dao = new FakeDao([op1, op2]);
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const before1 = { ...op1 };
    const before2 = { ...op2 };
    await expect(svc.retry({ userId: u1, sessionId }, { operationId: op1.id, requestKey: op2.requestKey })).rejects.toMatchObject({ reason: "conflict" });
    expect(dao.operations.get(op1.id)).toEqual(before1);
    expect(dao.operations.get(op2.id)).toEqual(before2);
  });

  it("UT-006 verified imported GitHub author is eligible independent of assignee", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts({ origin: "external", authorUserId: null, status: "imported", issueNodeId: "I_41", issueNumber: 41 }));
    const svc = service(dao, { githubIdentity: async (userId) => (userId === u1 ? "1001" : null) });
    const preview = await svc.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 });
    expect(preview.canDelete).toBe(true);
    const other = service(dao, { githubIdentity: async () => "9999", personalContext: async (): Promise<PersonalContext> => ({ kind: "ok", token: "token", githubUserId: "9999", repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" }) });
    expect((await other.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 })).canDelete).toBe(false);
  });

  it("UT-007 missing imported author leaves only admin path", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts({ origin: "external", authorUserId: null, status: "imported", issueNodeId: "I_41", issueNumber: 41 }));
    const svc = service(dao, { githubIdentity: async (userId) => (userId === admin ? "3003" : null), personalContext: async (actor): Promise<PersonalContext> => ({ kind: "ok", token: "token", githubUserId: actor.userId === admin ? "3003" : "1001", repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" }) }, { inspect: async () => ({ ok: true, value: { nodeId: "I_41", number: 41, title: "Issue 41", repositoryId: "202", repositoryNodeId: "R_202", repositoryOwner: "acme", repositoryName: "private", authorDatabaseId: null, viewerCanDelete: true } }) });
    expect((await svc.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 })).canDelete).toBe(false);
    expect((await svc.preview({ userId: admin }, { kind: "task", projectId: p1, taskId: t1 })).canDelete).toBe(true);
  });

  it("linked Flow Dev deletion requires current GitHub authorization and provider permission before reserve", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts({ status: "published", issueNodeId: "I_41", issueNumber: 41 }));
    const svc = service(dao, { personalContext: async (): Promise<PersonalContext> => ({ kind: "authorization" }) });
    const preview = await svc.preview({ userId: u1 }, { kind: "task", projectId: p1, taskId: t1 });
    expect(preview.canDelete).toBe(false);
    expect(preview.deleteReason).toBe("authorization_needed");
    await expect(svc.start({ userId: u1, sessionId }, startInput(preview.fingerprint, crypto.randomUUID()))).rejects.toMatchObject({ reason: "forbidden" });
    expect(dao.reserved).toBe(0);
  });

  it("imported-task admin still requires GitHub permission before reserve", async () => {
    const dao = new FakeDao();
    dao.taskFactsMap.set(t1, facts({ origin: "external", authorUserId: null, status: "imported", issueNodeId: "I_41", issueNumber: 41 }));
    const inspect = async () => ({ ok: true as const, value: { nodeId: "I_41", number: 41, title: "Issue 41", repositoryId: "202", repositoryNodeId: "R_202", repositoryOwner: "acme", repositoryName: "private", authorDatabaseId: null, viewerCanDelete: false } });
    const svc = service(dao, { githubIdentity: async () => "3003", personalContext: async (): Promise<PersonalContext> => ({ kind: "ok", token: "token", githubUserId: "3003", repositoryId: "202", repositoryNodeId: "R_202", owner: "acme", name: "private" }) }, { inspect });
    const preview = await svc.preview({ userId: admin }, { kind: "task", projectId: p1, taskId: t1 });
    expect(preview.canDelete).toBe(false);
    expect(preview.deleteReason).toBe("github_permission_denied");
    await expect(svc.start({ userId: admin, sessionId }, startInput(preview.fingerprint, crypto.randomUUID()))).rejects.toMatchObject({ reason: "forbidden" });
    expect(dao.reserved).toBe(0);
  });

  it("UT-025 status with lost project access returns safe NOT_FOUND", async () => {
    const now = new Date();
    const op: DeletionOperation = { id: crypto.randomUUID(), projectId: p1, taskId: t1, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: null, issueNumber: null, initiatorUserId: u1, requestKey: "d0000000-0000-4000-8000-000000000001", state: "recoverable", remotePresence: "not_applicable", workStopped: true, reason: "unknown_stop", retryAt: null, leaseOwner: null, leaseFence: 0, leaseUntil: null, createdAt: now, updatedAt: now, completedAt: null };
    const dao = new FakeDao([op]);
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao, { requireProject: async () => null });
    const error = await svc.status({ userId: u1 }, op.id).catch((caught: unknown) => caught) as IssueDeletionError;
    expect(error).toBeInstanceOf(IssueDeletionError);
    expect(error.reason).toBe("target_unavailable");
    expect(error.message).toBe("target_unavailable");
  });

  it("UT-026 retry leaves stopped work stopped and schedules no restart", async () => {
    const now = new Date();
    const op: DeletionOperation = { id: crypto.randomUUID(), projectId: p1, taskId: t1, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: null, issueNumber: null, initiatorUserId: u1, requestKey: "c0000000-0000-4000-8000-000000000001", state: "recoverable", remotePresence: "not_applicable", workStopped: true, reason: "unknown_stop", retryAt: null, leaseOwner: null, leaseFence: 0, leaseUntil: null, createdAt: now, updatedAt: now, completedAt: null };
    const dao = new FakeDao([op]);
    dao.taskFactsMap.set(t1, facts());
    const svc = service(dao);
    const status = await svc.retry({ userId: u1, sessionId }, { operationId: op.id, requestKey: crypto.randomUUID() });
    expect(status.workStopped).toBe(true);
    expect(dao.resumeCalls).toEqual([{ operationId: op.id, state: "cleaning_local" }]);
    expect(dao.reserved).toBe(0);
  });
});
