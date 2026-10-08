import { eq } from "drizzle-orm";
import { taskIssueClaims, taskIssueSnapshots, taskIssueSources, taskPublicationAttempts } from "../src/infra/database/schema";
import type { Database } from "../src/infra/database/client";
import type { AssignedIssueGateway, BoardItemFacts } from "../src/application/github/assignedIssueGateway";
import { AssignedIssueVerifier } from "../src/application/services/assigned-issues/assignedIssueVerifier";
import { sourceContentHash } from "../src/application/services/assigned-issues/assignedIssueRules";
import { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import { WorkOperability } from "../src/application/services/assigned-issues/workOperability";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueSourceDao";
import type { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";

export const OPERATOR_BOARD = "PVT_board";
export const OPERATOR_PROGRESS = "opt_progress";
export type OperatorWorld = { title: string; body: string; state: string; statusOptionId: string; assignees: string[]; optionName: string; boardNodeId: string; contents: Record<string, { title: string; body: string }> };
type Seed = { database: Database; projectId: string; taskId: string; attemptId: string; operatorId: string; world?: OperatorWorld };

export function operatorWorld(overrides: Partial<OperatorWorld> = {}): OperatorWorld {
  return { title: "Título", body: "Corpo", state: "OPEN", statusOptionId: OPERATOR_PROGRESS, assignees: ["88", "77"], optionName: "In Progress", boardNodeId: OPERATOR_BOARD, contents: {}, ...overrides };
}

export function worldGateway(world: OperatorWorld): AssignedIssueGateway {
  const item = (itemId: string): BoardItemFacts => ({ itemId, boardNodeId: world.boardNodeId, archived: false, contentType: "Issue", statusOptionId: world.statusOptionId, issue: { nodeId: itemId.replace("PVTI_", ""), number: 41, url: "https://github.com/acme/private/issues/41", title: (world.contents[itemId] ?? world).title, body: (world.contents[itemId] ?? world).body, state: world.state, updatedAt: "2026-10-01T10:00:00Z", repositoryNodeId: "R_202", repositoryId: "202", repositoryOwner: "acme", repositoryName: "private", assignees: world.assignees.map((githubId) => ({ githubId, login: null })), assigneesHasNextPage: false, assigneesCursor: null } });
  return { statusField: async () => ({ fieldId: "PVTSSF_status", options: [{ id: OPERATOR_PROGRESS, name: world.optionName }, { id: "opt_ready", name: "Ready" }] }), item: async (_token, itemId) => item(itemId), itemsPage: async () => ({ items: [], hasNextPage: false, endCursor: null }), assignees: async () => ({ assignees: [], hasNextPage: false, endCursor: null }), setStatus: async () => {} };
}

export function operatorAuthorization(database: Database, repositories: RepositoryAccessService, world: OperatorWorld) {
  const gateway = worldGateway(world);
  const operability = new WorkOperability({ gateway, verifier: new AssignedIssueVerifier(gateway) });
  return new WorkAuthorization({ repositories, sources: new DrizzleIssueSourceDao(database), claims: new DrizzleIssueClaimDao(database), operability });
}

export async function seedOperatorClaim(seed: Seed, content: { title: string; body: string } = { title: "Título", body: "Corpo" }) {
  const { database } = seed;
  const [attempt] = await database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.id, seed.attemptId));
  const [source] = await database.insert(taskIssueSources).values({ taskId: seed.taskId, projectId: seed.projectId, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: attempt?.issueNodeId ?? "I_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", origin: "flow_dev", publicationAttemptId: seed.attemptId }).returning();
  const contentHash = sourceContentHash({ repositoryId: "202", issueNodeId: source!.issueNodeId, title: content.title, bodyMarkdown: content.body });
  const [snapshot] = await database.insert(taskIssueSnapshots).values({ sourceId: source!.id, taskId: seed.taskId, revision: 1, title: content.title, bodyMarkdown: content.body, githubUpdatedAt: new Date("2026-10-01T10:00:00Z"), contentHash, verifiedAt: new Date("2026-10-01T10:00:00Z"), verifiedByUserId: seed.operatorId, origin: "flow_dev", publicationAttemptId: seed.attemptId }).returning();
  await database.update(taskIssueSources).set({ currentSnapshotId: snapshot!.id }).where(eq(taskIssueSources.id, source!.id));
  const [claim] = await database.insert(taskIssueClaims).values({ sourceId: source!.id, taskId: seed.taskId, projectId: seed.projectId, candidateUserId: seed.operatorId, operatorUserId: seed.operatorId, state: "claimed", boardNodeId: OPERATOR_BOARD, boardItemId: `PVTI_${source!.issueNodeId}`, statusFieldId: "PVTSSF_status", optionId: OPERATOR_PROGRESS, sourceSnapshotId: snapshot!.id, claimedAt: new Date("2026-10-02T10:00:00Z") }).returning();
  if (seed.world) seed.world.contents[`PVTI_${source!.issueNodeId}`] = content;
  return { sourceId: source!.id, snapshotId: snapshot!.id, claimId: claim!.id };
}
