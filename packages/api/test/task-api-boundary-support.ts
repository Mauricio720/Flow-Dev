import type { TaskDao } from "../src/application/database/dao/taskDao";
import type { GitHubIssueGateway } from "../src/application/github/issueGateway";
import { TasksController } from "../src/controllers/tasksController";
import { TaskPublicationController } from "../src/controllers/taskPublicationController";
import { DrizzleTaskPublicationDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationDao";
import { createTasksRouter } from "../src/routers/tasks";
import { draft, taskFixture } from "./task-api-support";

export function boundaryCaller(setup: Awaited<ReturnType<typeof taskFixture>>, userId: string | null, dao: TaskDao = setup.taskDao) {
  const gateway = { eligibility: async () => ({ repositoryId: "202", owner: "acme", name: "private", publisherGithubId: "88", archived: false, issuesEnabled: true, canRead: true, canCreateIssues: true }), create: async () => ({ status: "uncertain" as const, reason: "delivery_unknown" as const }), verify: async () => null } as unknown as GitHubIssueGateway;
  const publication = new TaskPublicationController(dao, new DrizzleTaskPublicationDao(setup.database), setup.repositoryAccess, gateway);
  const tasks = new TasksController(dao, setup.repositoryAccess);
  return createTasksRouter(tasks, publication).createCaller({ principal: userId ? { userId, sessionId: setup.sessionId } : null, requestId: "boundary-test" });
}

export function allProtectedCalls(setup: Awaited<ReturnType<typeof taskFixture>>, caller: ReturnType<typeof boundaryCaller>, taskId = setup.taskId) {
  const base = { projectId: setup.project.id, taskId };
  return [caller.list({ projectId: setup.project.id, limit: 30 }), caller.byId(base), caller.messages({ ...base, limit: 30 }), caller.revisions({ ...base, limit: 30 }), caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Corrigir total" }), caller.send({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, message: "Preservar regra fiscal" }), caller.submission({ projectId: setup.project.id, action: "send", requestKey: crypto.randomUUID() }), caller.retryGeneration({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, failedOperationId: setup.proposalId }), caller.saveDraft({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, baseRevisionId: setup.revisionId, draft, evidenceBindings: [] }), caller.resolveRefinement({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, proposalOperationId: setup.proposalId, decision: "discard", selectedPaths: [] }), caller.preview({ ...base, revisionId: setup.revisionId }), caller.publish({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: "a".repeat(64) }), caller.reconcilePublication({ ...base, requestKey: crypto.randomUUID(), expectedVersion: 7, attemptId: setup.proposalId })];
}
