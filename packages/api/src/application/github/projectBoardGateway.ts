export type ProjectBoard = { nodeId: string; url: string; title: string };
export type BoardOwnerKind = "organization" | "user";
export type BoardReference = { ownerKind: BoardOwnerKind; owner: string; number: number };
export type BoardItemTarget = { boardNodeId: string; issueNodeId: string };
export type BoardStatus = "backlog" | "ready";
export type BacklogItem = BoardItemTarget & { priorityPoints?: number | null };
export type IssuePresence = "absent" | "present" | "closed";

export class ProjectBoardNotFoundError extends Error {}
export class BacklogStatusMissingError extends Error {}
export class BoardStatusMissingError extends Error { constructor(readonly status: BoardStatus) { super(status); } }

export interface GitHubProjectBoardGateway {
  resolve(token: string, reference: BoardReference): Promise<ProjectBoard>;
  statuses(token: string, boardNodeId: string): Promise<BoardStatus[]>;
  place(token: string, item: BacklogItem & { status: BoardStatus }): Promise<void>;
  issuePresence(token: string, target: BoardItemTarget): Promise<IssuePresence>;
}
