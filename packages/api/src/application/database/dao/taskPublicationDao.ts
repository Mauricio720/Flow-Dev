import type { IssueReceipt, CreationOutcome } from "../../github/issueGateway";

export type PublicationApproval = { projectId: string; taskId: string; actorUserId: string; sessionId: string; requestKey: string; expectedVersion: number; revisionId: string; repositoryId: string; repositoryNodeId: string; publisherGithubId: string; owner: string; name: string; previewHash: string; title: string; bodyMarkdown: string };
export type PublicationAccepted = { taskId: string; attemptId: string; operationId: string; version: number; status: "publishing"; created: boolean };
export type PublicationAttempt = { taskId: string; attemptId: string; operationId: string; repositoryId: string; publisherGithubId: string; owner: string; name: string; title: string; bodyMarkdown: string; outcome: "queued" | "dispatching" | "created" | "rejected" | "uncertain"; issueNumber: number | null; receipt: IssueReceipt | null };

export interface TaskPublicationDao {
  accepted(input: Pick<PublicationApproval, "projectId" | "taskId" | "actorUserId" | "requestKey" | "expectedVersion" | "revisionId" | "repositoryId" | "previewHash">): Promise<PublicationAccepted | null>;
  approve(input: PublicationApproval): Promise<PublicationAccepted>;
  fenceDispatch(taskId: string, attemptId: string): Promise<PublicationAttempt | null>;
  settle(taskId: string, attemptId: string, outcome: CreationOutcome): Promise<void>;
  reconciliation(taskId: string, attemptId: string, projectId: string, actorUserId: string, expectedVersion: number, requestKey: string): Promise<{ status: string; receipt?: IssueReceipt }>;
}
