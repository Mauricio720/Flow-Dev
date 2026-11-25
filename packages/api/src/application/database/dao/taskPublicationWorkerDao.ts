import type { CreationOutcome } from "../../github/issueGateway";
import type { ReadyAssignmentResult } from "../../services/tasks/taskContracts";

export type PublicationWorkerClaim = { taskId: string; attemptId: string; operationId: string; projectId: string; sessionId: string; publisherUserId: string; publisherGithubId: string; repositoryId: string; repositoryNodeId: string; owner: string; name: string; revisionId: string; previewHash: string; title: string; bodyMarkdown: string; assignToSelf: boolean; workerId: string };

export interface TaskPublicationWorkerDao {
  claim(workerId: string): Promise<PublicationWorkerClaim | null>;
  heartbeat(claim: PublicationWorkerClaim): Promise<void>;
  sessionActive(claim: PublicationWorkerClaim): Promise<boolean>;
  fenceDispatch(claim: PublicationWorkerClaim): Promise<boolean>;
  settle(claim: PublicationWorkerClaim, outcome: CreationOutcome, dispatched: boolean): Promise<void>;
  recordReadyAssignment(claim: PublicationWorkerClaim, result: ReadyAssignmentResult): Promise<boolean>;
}
