import { eq } from "drizzle-orm";
import { taskDraftRevisions, taskOperations, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import type { AssignedFixture } from "./assigned-support";

export const PUBLISHED = { taskId: "20000000-0000-4000-8000-000000000001", operationId: "60000000-0000-4000-8000-000000000001", attemptId: "70000000-0000-4000-8000-000000000001" };
export const RECEIPT = { issueId: "4101", nodeId: "I_fixture_41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", createdAt: "2026-10-01T10:00:00.000Z" };
const TITLE = "Implement CSV export";
const BODY = "Implement CSV export.";

export async function seedPublication(f: AssignedFixture, outcome: "created" | "dispatching", ids = PUBLISHED) {
  const revisionId = crypto.randomUUID();
  await f.database.insert(tasks).values({ id: ids.taskId, projectId: f.project.id, authorUserId: f.u1.id, repositoryId: "202", repositoryNodeId: "R_202", status: outcome === "created" ? "published" : "publishing", version: 7, title: TITLE });
  await f.database.insert(taskDraftRevisions).values({ id: revisionId, taskId: ids.taskId, revisionNumber: 1, canonicalDraft: { title: TITLE }, createdByUserId: f.u1.id });
  await f.database.insert(taskOperations).values({ id: ids.operationId, taskId: ids.taskId, kind: "publish", state: outcome === "created" ? "succeeded" : "running", initiatedSessionId: crypto.randomUUID(), baseTaskVersion: 6 });
  const created = outcome === "created";
  await f.database.insert(taskPublicationAttempts).values({ id: ids.attemptId, taskId: ids.taskId, operationId: ids.operationId, revisionId, publisherUserId: f.u1.id, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: TITLE, bodySnapshot: BODY, approvalSessionId: "session", outcome, issueId: created ? RECEIPT.issueId : null, issueNodeId: created ? RECEIPT.nodeId : null, issueNumber: created ? 41 : null, issueUrl: created ? RECEIPT.url : null, issueCreatedAt: created ? new Date(RECEIPT.createdAt) : null });
  if (!created) await f.database.update(tasks).set({ activeOperationId: ids.operationId }).where(eq(tasks.id, ids.taskId));
}
