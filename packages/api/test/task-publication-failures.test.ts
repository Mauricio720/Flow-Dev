import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { githubResponse, repository } from "./fixture";
import { publicationCase } from "./task-publication-case";

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

describe("publication validation and rejection with PostgreSQL", () => {
  it("IT-207 blocks publication when the saved objective is blank", async () => {
    const scenario = await publicationCase({ draft: { title: "Corrigir total", context: "Contexto", objective: " ", constraints: [], relevantContext: [], productConsiderations: [], references: [] } });
    close = scenario.close;
    await expect(scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId })).rejects.toMatchObject({ cause: { reason: "invalid_draft" } });
    expect(await scenario.state.database.select().from(taskPublicationAttempts)).toHaveLength(0);
  });

  it("IT-208 refuses preview without a current saved revision", async () => {
    const scenario = await publicationCase({ withoutRevision: true });
    close = scenario.close;
    await expect(scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId })).rejects.toMatchObject({ cause: { reason: "preview_not_ready" } });
  });

  it("IT-036 refuses preview while the task still needs clarification", async () => {
    const scenario = await publicationCase();
    close = scenario.close;
    await scenario.state.database.update(tasks).set({ status: "awaiting_clarification" }).where(eq(tasks.id, scenario.taskId));
    await expect(scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId })).rejects.toMatchObject({ cause: { reason: "preview_not_ready" } });
  });

  it("IT-210 keeps publication author-only for a project reader", async () => {
    const scenario = await publicationCase();
    close = scenario.close;
    await scenario.state.permissions.assign(scenario.state.admin.id, scenario.project.id, scenario.state.admin.id);
    await scenario.state.authorize(scenario.state.admin.id);
    const preview = await scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId });
    await expect(scenario.caller(scenario.state.admin.id).publish({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: scenario.revisionId, repositoryId: "202", previewHash: preview.previewHash })).rejects.toMatchObject({ cause: { reason: "author_required" } });
    expect(await scenario.state.database.select().from(taskPublicationAttempts)).toHaveLength(0);
  });

  it("IT-209 returns a rejected Issue attempt to review without retrying", async () => {
    const scenario = await publicationCase({ creation: { status: "rejected", reason: "content_rejected" } });
    close = scenario.close;
    await approve(scenario);
    await scenario.worker.tick();
    await expect(scenario.taskDao.findScoped(scenario.project.id, scenario.taskId)).resolves.toMatchObject({ status: "draft_ready", activeOperationId: null });
    expect((await scenario.state.database.select().from(taskPublicationAttempts))[0]?.outcome).toBe("rejected");
    expect(scenario.calls.create).toBe(1);
  });

  it("IT-215 rechecks destination state before Issue creation", async () => {
    const scenario = await publicationCase();
    close = scenario.close;
    await approve(scenario);
    scenario.setArchived(true);
    await scenario.worker.tick();
    expect(scenario.calls.create).toBe(0);
    expect((await scenario.state.database.select().from(taskPublicationAttempts))[0]?.rejectionReason).toBe("repository_archived");
  });

  it.each([
    ["IT-038", { archived: true }, "repository_archived"],
    ["IT-039", { issuesEnabled: false }, "issues_disabled"],
    ["IT-040", { publisherGithubId: "999" }, "identity_mismatch"],
    ["IT-041", { canCreateIssues: false }, "issue_permission_denied"],
  ])("%s blocks preview when GitHub eligibility fails", async (_id, eligibility, reason) => {
    const scenario = await publicationCase({ eligibility });
    close = scenario.close;
    await expect(scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId })).rejects.toMatchObject({ cause: { reason } });
    expect(await scenario.state.database.select().from(taskPublicationAttempts)).toHaveLength(0);
  });

  it("IT-037 invalidates the reviewed hash when the verified repository is renamed", async () => {
    const scenario = await publicationCase();
    close = scenario.close;
    const preview = await scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId });
    scenario.state.fetcher.mockImplementation(async (url) => githubResponse(String(url), { ...repository, name: "private-renamed" }));
    await expect(scenario.caller().publish({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: scenario.revisionId, repositoryId: "202", previewHash: preview.previewHash })).rejects.toMatchObject({ cause: { reason: "preview_changed" } });
  });

  it("IT-042 and IT-043 reject reconciliation before uncertainty or for another attempt", async () => {
    const scenario = await publicationCase();
    close = scenario.close;
    const accepted = await approve(scenario);
    await expect(scenario.caller().reconcilePublication({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: crypto.randomUUID(), expectedVersion: 8, attemptId: accepted.attemptId })).rejects.toMatchObject({ cause: { reason: "attempt_not_uncertain" } });
    await expect(scenario.caller().reconcilePublication({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: crypto.randomUUID(), expectedVersion: 8, attemptId: crypto.randomUUID() })).rejects.toMatchObject({ cause: { reason: "wrong_attempt" } });
  });
});

async function approve(scenario: Awaited<ReturnType<typeof publicationCase>>) {
  const preview = await scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId });
  return scenario.caller().publish({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: scenario.revisionId, repositoryId: "202", previewHash: preview.previewHash });
}
