import type { CreationOutcome, IssueReceipt } from "../../github/issueGateway";

export type PublicationWorkerClaim = { taskId: string; attemptId: string; operationId: string; projectId: string; sessionId: string; publisherUserId: string; publisherGithubId: string; repositoryId: string; repositoryNodeId: string; owner: string; name: string; revisionId: string; previewHash: string; title: string; bodyMarkdown: string; workerId: string };

export interface TaskPublicationWorkerDao {
  claim(workerId: string): Promise<PublicationWorkerClaim | null>;
  heartbeat(claim: PublicationWorkerClaim): Promise<void>;
  sessionActive(claim: PublicationWorkerClaim): Promise<boolean>;
  fenceDispatch(claim: PublicationWorkerClaim): Promise<boolean>;
  settle(claim: PublicationWorkerClaim, outcome: CreationOutcome, dispatched: boolean): Promise<void>;
}
