import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TaskDao } from "../application/database/dao/taskDao";
import { TasksController, mapTaskError } from "./tasksController";

const task = { id: "00000000-0000-4000-8000-000000000011", projectId: "00000000-0000-4000-8000-000000000001", authorUserId: "00000000-0000-4000-8000-000000000021", repositoryId: "202", repositoryNodeId: "REPO202", status: "draft_ready", version: 7, currentRevisionId: "00000000-0000-4000-8000-000000000037", activeOperationId: null, pendingProposalOperationId: null, title: "Corrigir total", lastError: null, createdAt: new Date("2026-10-01T12:00:00Z"), updatedAt: new Date("2026-10-01T12:00:00Z") };
const draft = { title: "Corrigir total", context: "Contexto", objective: "Objetivo", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
const revision = { id: task.currentRevisionId, taskId: task.id, revisionNumber: 7, parentRevisionId: null, operationId: null, canonicalDraft: draft, evidenceBindings: [], manuallyEditedPaths: [], createdAt: task.createdAt };
const actor = { userId: task.authorUserId, sessionId: "session-1" };

function controller(overrides: Partial<TaskDao> = {}) {
  const dao = { snapshot: async (read: (dao: TaskDao) => Promise<unknown>) => read(dao as TaskDao), planning: async () => ({ taskStatus: "draft_ready", planningStatus: null, operation: null, decision: null, publication: null }), findScoped: async () => task, currentRevision: async () => revision, evidence: async () => [], pendingProposal: async () => null, publication: async () => null, activity: async () => [], authorNames: async () => new Map([[task.authorUserId, "Ana"]]), ...overrides } as unknown as TaskDao;
  const repositories = { requireRead: async () => ({ githubId: "202", nodeId: "REPO202" }) } as never;
  return new TasksController(dao, repositories);
}

describe("TasksController", () => {
  it("UT-003 maps a stored revision and dates into an explicit DTO", async () => {
    const result = await controller().byId(actor, { projectId: task.projectId, taskId: task.id });
    expect(result.currentRevision?.id).toBe(revision.id);
    expect(result.currentRevision?.createdAt).toBe("2026-10-01T12:00:00.000Z");
    expect(result.permissions.canEdit).toBe(true);
  });
  it("identifies the author and returns only the recorded tool activity", async () => {
    const recorded = [{ toolCallId: "call-1", operationId: "00000000-0000-4000-8000-000000000041", tool: "searchProject" as const, target: "total", status: "empty" as const, reason: null, durationMs: 12, sequence: 1 }];
    const result = await controller({ activity: async () => recorded }).byId(actor, { projectId: task.projectId, taskId: task.id });
    expect(result.task.authorName).toBe("Ana");
    expect(result.activity).toEqual(recorded);
    const reader = await controller({ authorNames: async () => new Map() }).byId({ userId: "00000000-0000-4000-8000-000000000022" }, { projectId: task.projectId, taskId: task.id });
    expect(reader).toMatchObject({ task: { authorName: null }, activity: [], permissions: { canEdit: false } });
  });
  it("lists each task with its author name resolved once per author", async () => {
    const summary = { id: task.id, projectId: task.projectId, authorUserId: task.authorUserId, status: "draft_ready" as const, planningStatus: null, version: 7, title: task.title, labels: [], createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" };
    const requested: string[][] = [];
    const page = await controller({ list: async () => ({ items: [summary, { ...summary, id: "00000000-0000-4000-8000-000000000012" }], nextCursor: null }), authorNames: async (ids) => { requested.push(ids); return new Map([[task.authorUserId, "Ana"]]); } }).list(actor, { projectId: task.projectId, limit: 30 });
    expect(page.items.map((item) => item.authorName)).toEqual(["Ana", "Ana"]);
    expect(requested).toEqual([[task.authorUserId]]);
  });
  it("UT-102 rejects malformed stored draft content without inventing values", async () => {
    const invalid = { ...revision, canonicalDraft: { title: "only a title" } };
    await expect(controller({ currentRevision: async () => invalid }).byId(actor, { projectId: task.projectId, taskId: task.id })).rejects.toMatchObject({ reason: "invalid_stored_content" });
  });
  it("does not accept browser supplied verification bindings when saving a draft", async () => {
    let received: unknown;
    const saveDraft = async (input: unknown) => { received = input; return revision; };
    await controller({ saveDraft: saveDraft as TaskDao["saveDraft"] }).saveDraft(actor, { projectId: task.projectId, taskId: task.id, requestKey: "request", expectedVersion: 7, baseRevisionId: revision.id, draft, evidenceBindings: [{ evidenceId: "forged", verification: "retrieved" }] });
    expect(received).toMatchObject({ evidenceBindings: [] });
  });
  it("binds manual sources only to persisted evidence for the task repository", async () => {
    let received: unknown;
    const evidence = [{ id: "ev-1", repositoryId: task.repositoryId, operationId: "op-1", type: "project-file" as const, path: "src/cart.ts", commitSha: "a".repeat(40), fromLine: 3, toLine: 5, issueId: null, issueNumber: null, url: "https://github.com/acme/cart/blob/commit/src/cart.ts" }];
    const draftWithSource = { ...draft, references: [{ type: "project-file" as const, path: "src/cart.ts", line: 4, repository: null, issueNumber: null, url: null }] };
    const saveDraft = async (input: unknown) => { received = input; return revision; };
    await controller({ evidence: async () => evidence, saveDraft: saveDraft as TaskDao["saveDraft"] }).saveDraft(actor, { projectId: task.projectId, taskId: task.id, requestKey: "request", expectedVersion: 7, baseRevisionId: revision.id, draft: draftWithSource, evidenceBindings: [] });
    expect(received).toMatchObject({ evidenceBindings: [{ evidenceId: "ev-1", fieldPath: "references.0", verification: "author-edited" }] });
    await expect(controller({ evidence: async () => [], saveDraft: saveDraft as TaskDao["saveDraft"] }).saveDraft(actor, { projectId: task.projectId, taskId: task.id, requestKey: "request", expectedVersion: 7, baseRevisionId: revision.id, draft: draftWithSource, evidenceBindings: [] })).rejects.toMatchObject({ reason: "invalid_agent_source" });
  });
  it("UT-004 maps unknown storage errors to a safe service error", () => {
    try { mapTaskError(new Error("driver password leaked")); } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).not.toContain("driver password");
      expect((error as TRPCError).cause).toMatchObject({ reason: "service_unavailable" });
    }
  });
});
