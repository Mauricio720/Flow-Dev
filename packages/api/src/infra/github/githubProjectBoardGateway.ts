import { GITHUB_TIMEOUT_MS } from "./githubRequest";
import { DEFAULT_TRANSPORT, githubGraphql } from "./githubGraphql";
import { BacklogStatusMissingError, ProjectBoardNotFoundError } from "../../application/github/projectBoardGateway";
import type { BacklogItem, BoardItemTarget, BoardReference, GitHubProjectBoardGateway, IssuePresence, ProjectBoard } from "../../application/github/projectBoardGateway";
import { RepositoryUnavailableError } from "../../application/github/repositoryErrors";
import { findBacklogOption, findPriorityFieldId } from "../../application/services/projects/projectBoardRules";
import { ADD_ITEM_MUTATION, BOARD_NODE_QUERY, ISSUE_PRESENCE_QUERY, ORGANIZATION_BOARD_QUERY, SET_PRIORITY_MUTATION, SET_STATUS_MUTATION, USER_BOARD_QUERY } from "./projectBoardQueries";
import type { AddItemData, BoardNode, BoardNodeData, IssuePresenceData, OwnerBoardData } from "./projectBoardQueries";

const CLOSED_ISSUE_STATE = "CLOSED";
type StatusTarget = { fieldId: string; optionId: string };

export class GitHubHttpProjectBoardGateway implements GitHubProjectBoardGateway {
  private readonly transport: ReturnType<typeof DEFAULT_TRANSPORT>;
  constructor(fetcher: typeof fetch = fetch, baseUrl = "https://api.github.com", timeoutMs = GITHUB_TIMEOUT_MS) { this.transport = DEFAULT_TRANSPORT(fetcher, baseUrl, timeoutMs); }

  async resolve(token: string, reference: BoardReference): Promise<ProjectBoard> {
    const query = reference.ownerKind === "organization" ? ORGANIZATION_BOARD_QUERY : USER_BOARD_QUERY;
    const data = await this.graphql<OwnerBoardData>(token, query, { login: reference.owner, number: reference.number });
    const board = openBoard(data.owner?.projectV2);
    backlogTarget(board);
    return { nodeId: board.id!, url: board.url!, title: board.title! };
  }

  async assertBacklog(token: string, boardNodeId: string) { backlogTarget(await this.board(token, boardNodeId)); }

  async placeInBacklog(token: string, item: BacklogItem) {
    const board = await this.board(token, item.boardNodeId);
    const backlog = backlogTarget(board);
    const itemId = await this.setStatus(token, item, backlog);
    await this.setPriority(token, board, { itemId, points: item.priorityPoints });
  }

  // addProjectV2ItemById returns the existing item when the issue is already on the board.
  private async setStatus(token: string, target: BoardItemTarget, status: StatusTarget) {
    const added = await this.graphql<AddItemData>(token, ADD_ITEM_MUTATION, { board: target.boardNodeId, content: target.issueNodeId });
    const itemId = added.addProjectV2ItemById?.item?.id;
    if (!itemId) throw new RepositoryUnavailableError();
    await this.graphql(token, SET_STATUS_MUTATION, { board: target.boardNodeId, item: itemId, field: status.fieldId, option: status.optionId });
    return itemId;
  }

  async issuePresence(token: string, target: BoardItemTarget): Promise<IssuePresence> {
    const data = await this.graphql<IssuePresenceData>(token, ISSUE_PRESENCE_QUERY, { id: target.issueNodeId });
    if (!data.node?.state) throw new RepositoryUnavailableError();
    if (data.node.projectItems?.nodes?.some((item) => item?.project?.id === target.boardNodeId)) return "present";
    return data.node.state === CLOSED_ISSUE_STATE ? "closed" : "absent";
  }

  private async setPriority(token: string, board: BoardNode, entry: { itemId: string; points?: number | null }) {
    const fieldId = findPriorityFieldId(board.fields?.nodes ?? []);
    if (entry.points == null || !fieldId) return;
    await this.graphql(token, SET_PRIORITY_MUTATION, { board: board.id, item: entry.itemId, field: fieldId, points: entry.points });
  }

  private async board(token: string, boardNodeId: string) {
    const data = await this.graphql<BoardNodeData>(token, BOARD_NODE_QUERY, { id: boardNodeId });
    return openBoard(data.node);
  }

  private graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
    return githubGraphql<T>(this.transport, token, query, variables);
  }
}

function openBoard(board: BoardNode | null | undefined) {
  if (!board?.id || !board.url || !board.title || board.closed) throw new ProjectBoardNotFoundError();
  return board;
}

function backlogTarget(board: BoardNode): StatusTarget {
  const option = findBacklogOption(board.field?.options ?? []);
  if (!board.field?.id || !option) throw new BacklogStatusMissingError();
  return { fieldId: board.field.id, optionId: option.id };
}

