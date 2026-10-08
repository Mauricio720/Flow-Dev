import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { adminDesignations, taskCaptureLeases, taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { DrizzleTaskCaptureDao } from "../src/infra/database/dao/tasks/drizzleTaskCaptureDao";
import { AudioValidator } from "../src/infra/transcription/audioValidator";
import { TranscriptionController } from "../src/controllers/transcriptionController";
import { boundaryCaller } from "./task-api-boundary-support";
import { closeTaskFixture, draft, seedTask, taskFixture } from "./task-api-support";
import { publicationCase } from "./task-publication-case";

const MEMBER_GITHUB_ID = "88";
let closeCase: (() => Promise<void>) | undefined;
afterEach(async () => { vi.unstubAllEnvs(); await closeTaskFixture(); await closeCase?.(); closeCase = undefined; });

const demote = (setup: Awaited<ReturnType<typeof taskFixture>>) => setup.database.delete(adminDesignations).where(eq(adminDesignations.githubUserId, MEMBER_GITHUB_ID));
const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: { code: string; cause?: { reason: string } }) => ({ code: error.code, reason: error.cause?.reason }));
const key = () => crypto.randomUUID();

describe("authoring is administrator only", () => {
  it("assigned UT-011 rejects the next saveDraft after the author lost the administrator designation", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await demote(setup);
    const result = await rejection(setup.caller.saveDraft({ projectId: setup.project.id, taskId: setup.taskId, requestKey: key(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft, evidenceBindings: [] }));
    expect(result).toEqual({ code: "FORBIDDEN", reason: "admin_required" });
    expect((await setup.database.select().from(tasks))[0]).toMatchObject({ version: 7 });
  });

  it("assigned UT-012 denies ten racing non-administrator starts before any task is created", async () => {
    const setup = await taskFixture();
    await demote(setup);
    const results = await Promise.all(Array.from({ length: 10 }, () => rejection(setup.caller.start({ projectId: setup.project.id, requestKey: key(), message: "Corrigir total" }))));
    expect(results).toEqual(Array(10).fill({ code: "FORBIDDEN", reason: "admin_required" }));
    expect(await setup.database.select().from(tasks)).toHaveLength(0);
  });

  it("denies every authoring mutation and the publication preview to a demoted administrator", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    await demote(setup);
    const base = { projectId: setup.project.id, taskId: setup.taskId };
    const command = { ...base, expectedVersion: 7 };
    const caller = boundaryCaller(setup, setup.ownerId);
    const calls = [caller.send({ ...command, requestKey: key(), message: "Mais contexto" }), caller.retryGeneration({ ...command, requestKey: key(), failedOperationId: key() }), caller.resolveRefinement({ ...command, requestKey: key(), proposalOperationId: key(), decision: "apply", selectedPaths: [] }), caller.preview({ ...base, revisionId: setup.revisionId }), caller.publish({ ...command, requestKey: key(), revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }), caller.reconcilePublication({ ...command, requestKey: key(), attemptId: key() })];
    for (const outcome of await Promise.all(calls.map(rejection))) expect(outcome).toEqual({ code: "FORBIDDEN", reason: "admin_required" });
    expect(await setup.database.select().from(taskDraftRevisions)).toHaveLength(1);
  });

  it("assigned UT-004 keeps history readable for a non-administrator author with viewerCanAuthor=false", async () => {
    const setup = await taskFixture();
    await seedTask(setup, { messages: true });
    expect(await setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId })).toMatchObject({ viewerCanAuthor: true, permissions: { canEdit: true } });
    await demote(setup);
    const detail = await setup.caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect(detail).toMatchObject({ viewerCanAuthor: false, permissions: { canEdit: false }, task: { id: setup.taskId } });
    expect((await setup.caller.messages({ projectId: setup.project.id, taskId: setup.taskId, limit: 30 })).items.length).toBeGreaterThan(0);
  });

  it("assigned UT-008 returns 50 authored tasks and a continuation for a 51st", async () => {
    const setup = await taskFixture();
    const rows = Array.from({ length: 51 }, (_, index) => ({ id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: `Tarefa ${index}` }));
    await setup.database.insert(tasks).values(rows);
    vi.stubEnv("TASK_CURSOR_SECRET", "task-test-cursor-secret");
    const page = await setup.caller.list({ projectId: setup.project.id, limit: 50 });
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).not.toBeNull();
  });

  it("assigned IT-019 denies dictation admission to an administrator demoted after loading the page", async () => {
    vi.stubEnv("GROQ_API_KEY", "configured");
    const setup = await taskFixture();
    await seedTask(setup);
    const controller = new TranscriptionController(setup.taskDao, new DrizzleTaskCaptureDao(setup.database), setup.repositoryAccess, new AudioValidator(), { transcribe: async () => ({ text: "x" }) });
    await demote(setup);
    const actor = { userId: setup.ownerId, sessionId: setup.sessionId };
    await expect(controller.preflight(actor, { action: "start", projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7 })).rejects.toMatchObject({ reason: "admin_required" });
    expect(await setup.database.select().from(taskCaptureLeases)).toHaveLength(0);
  });

  it("assigned IT-020 reports repository_authorization_needed and keeps the draft when the administrator lacks personal authorization", async () => {
    const scenario = await publicationCase();
    closeCase = scenario.close;
    const { githubRepositoryAuthorizations } = await import("../src/infra/database/schema");
    await scenario.state.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, scenario.state.member.id));
    const result = await rejection(scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId }));
    expect(result).toEqual({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
    expect((await scenario.state.database.select().from(tasks))[0]).toMatchObject({ status: "draft_ready", currentRevisionId: scenario.revisionId });
  });
});
