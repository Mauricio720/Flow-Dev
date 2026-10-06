export type ProjectBoard = { nodeId: string; url: string; title: string };
export type BoardOwnerKind = "organization" | "user";
export type BoardReference = { ownerKind: BoardOwnerKind; owner: string; number: number };
export type BoardItemTarget = { boardNodeId: string; issueNodeId: string };
export type BacklogItem = BoardItemTarget & { priorityPoints?: number | null };
export type IssuePresence = "absent" | "present" | "closed";

export class ProjectBoardNotFoundError extends Error {}
export class BacklogStatusMissingError extends Error {}
export class ReadyStatusMissingError extends Error {}

export interface GitHubProjectBoardGateway {
  resolve(token: string, reference: BoardReference): Promise<ProjectBoard>;
  assertBacklog(token: string, boardNodeId: string): Promise<void>;
  placeInBacklog(token: string, item: BacklogItem): Promise<void>;
  moveToReady(token: string, target: BoardItemTarget): Promise<void>;
  issuePresence(token: string, target: BoardItemTarget): Promise<IssuePresence>;
}
