import type { RepositoryIdentity } from "./projectDao";
import type { IssueContextRequest, ScopedContextResult } from "../../github/scopedContextGateway";

export type ContextExecution = { taskId: string; operationId: string; executionId: string; fence: number; userId: string; sessionId: string; projectId: string; repositoryId: string; repositoryNodeId: string; repository: RepositoryIdentity; pinnedCommitSha: string | null };
export type ContextCall = { executionId: string; toolCallId: string; inputHash: string; request: IssueContextRequest; result: ScopedContextResult; durationMs: number; target: string };

export interface IssueContextDao {
  execution(executionId: string, capabilityHash: string, now: Date): Promise<ContextExecution | null>;
  supersededExecution(executionId: string, capabilityHash: string): Promise<boolean>;
  pinCommit(executionId: string, fence: number, commitSha: string): Promise<string>;
  findCall(executionId: string, toolCallId: string): Promise<{ inputHash: string; response: unknown } | null>;
  saveCall(context: ContextExecution, call: ContextCall): Promise<unknown>;
  activityCount(executionId: string): Promise<number>;
  hasActivity(executionId: string, toolCallId: string): Promise<boolean>;
}
