import { GITHUB_TIMEOUT_MS, githubRequest } from "./githubRequest";
import { BacklogStatusMissingError, ProjectBoardNotFoundError, ReadyStatusMissingError } from "../../application/github/projectBoardGateway";
import type { BacklogItem, BoardItemTarget, BoardReference, GitHubProjectBoardGateway, IssuePresence, ProjectBoard } from "../../application/github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";
import { findBacklogOption, findPriorityFieldId, findReadyOption } from "../../application/services/projects/projectBoardRules";
import { ADD_ITEM_MUTATION, BOARD_NODE_QUERY, ISSUE_PRESENCE_QUERY, ORGANIZATION_BOARD_QUERY, SET_PRIORITY_MUTATION, SET_STATUS_MUTATION, USER_BOARD_QUERY } from "./projectBoardQueries";
import type { AddItemData, BoardNode, BoardNodeData, IssuePresenceData, OwnerBoardData } from "./projectBoardQueries";

const ACCEPT = "application/vnd.github+json";
const RATE_LIMIT_WAIT_SECONDS = 60;
const CLOSED_ISSUE_STATE = "CLOSED";
type GraphqlError = { type?: string };
type StatusTarget = { fieldId: string; optionId: string };

export class GitHubHttpProjectBoardGateway implements GitHubProjectBoardGateway {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly baseUrl = "https://api.github.com", private readonly timeoutMs = GITHUB_TIMEOUT_MS) {}

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

  async moveToReady(token: string, target: BoardItemTarget) {
    const ready = readyTarget(await this.board(token, target.boardNodeId));
    await this.setStatus(token, target, ready);
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
    const fieldId = findPriorityFieldId([board.prioridade, board.priority]);
    if (entry.points == null || !fieldId) return;
    await this.graphql(token, SET_PRIORITY_MUTATION, { board: board.id, item: entry.itemId, field: fieldId, points: entry.points });
  }

  private async board(token: string, boardNodeId: string) {
    const data = await this.graphql<BoardNodeData>(token, BOARD_NODE_QUERY, { id: boardNodeId });
    return openBoard(data.node);
  }

  private async graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
    const init = { method: "POST", headers: { accept: ACCEPT, "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ query, variables }) };
    const { body } = await githubRequest<{ data?: T; errors?: GraphqlError[] }>(this.fetcher, { url: this.baseUrl + "/graphql", init }, this.timeoutMs);
    if (body.errors?.length) throw classify(body.errors);
    if (!body.data) throw new RepositoryUnavailableError();
    return body.data;
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

function readyTarget(board: BoardNode): StatusTarget {
  const option = findReadyOption(board.field?.options ?? []);
  if (!board.field?.id || !option) throw new ReadyStatusMissingError();
  return { fieldId: board.field.id, optionId: option.id };
}

function classify(errors: GraphqlError[]) {
  const types = errors.map((error) => error.type);
  if (types.includes("INSUFFICIENT_SCOPES")) return new RepositoryAuthorizationNeededError("Project board scope is missing");
  if (types.includes("RATE_LIMITED")) return new RepositoryRateLimitedError(RATE_LIMIT_WAIT_SECONDS);
  if (types.includes("NOT_FOUND")) return new ProjectBoardNotFoundError();
  if (types.includes("FORBIDDEN")) return new RepositoryForbiddenError();
  return new RepositoryUnavailableError();
}
