import { DEFAULT_TRANSPORT, githubGraphql } from "./githubGraphql";
import { GITHUB_TIMEOUT_MS } from "./githubRequest";
import { BOARD_ITEMS_QUERY, BOARD_ITEM_QUERY, ISSUE_ASSIGNEES_QUERY } from "./assignedIssueQueries";
import type { BoardItemData, BoardItemsData, IssueAssigneesData } from "./assignedIssueQueries";
import { BOARD_NODE_QUERY, SET_STATUS_MUTATION } from "./projectBoardQueries";
import type { BoardNodeData } from "./projectBoardQueries";
import { mapAssignees, mapItem } from "./assignedIssueMapper";
import { ProjectBoardNotFoundError } from "../../application/github/projectBoardGateway";
import type { AssignedIssueGateway, BoardItemFacts, StatusField, StatusMutation } from "../../application/github/assignedIssueGateway";
import { RepositoryUnavailableError } from "../../application/github/repositoryErrors";

export class GitHubHttpAssignedIssueGateway implements AssignedIssueGateway {
  private readonly transport: ReturnType<typeof DEFAULT_TRANSPORT>;
  constructor(fetcher: typeof fetch = fetch, baseUrl = "https://api.github.com", timeoutMs = GITHUB_TIMEOUT_MS) { this.transport = DEFAULT_TRANSPORT(fetcher, baseUrl, timeoutMs); }

  async statusField(token: string, boardNodeId: string): Promise<StatusField> {
    const data = await this.graphql<BoardNodeData>(token, BOARD_NODE_QUERY, { id: boardNodeId });
    const board = data.node;
    if (!board?.id || board.closed) throw new ProjectBoardNotFoundError();
    if (!board.field?.id) throw new RepositoryUnavailableError();
    return { fieldId: board.field.id, options: board.field.options ?? [] };
  }

  async itemsPage(token: string, input: { boardNodeId: string; after: string | null; first: number }) {
    const data = await this.graphql<BoardItemsData>(token, BOARD_ITEMS_QUERY, { id: input.boardNodeId, first: input.first, after: input.after });
    const connection = data.node?.items;
    if (!connection?.nodes) throw new RepositoryUnavailableError();
    const items = connection.nodes.map(mapItem).filter((item): item is BoardItemFacts => item !== null);
    return { items, hasNextPage: Boolean(connection.pageInfo?.hasNextPage), endCursor: connection.pageInfo?.endCursor ?? null };
  }

  async item(token: string, itemId: string) {
    const data = await this.graphql<BoardItemData>(token, BOARD_ITEM_QUERY, { id: itemId });
    return mapItem(data.node);
  }

  async assignees(token: string, input: { issueNodeId: string; after: string | null }) {
    const data = await this.graphql<IssueAssigneesData>(token, ISSUE_ASSIGNEES_QUERY, { id: input.issueNodeId, after: input.after });
    if (!data.node?.assignees) throw new RepositoryUnavailableError();
    return mapAssignees(data.node.assignees);
  }

  async setStatus(token: string, input: StatusMutation) {
    await this.graphql(token, SET_STATUS_MUTATION, { board: input.boardNodeId, item: input.itemId, field: input.fieldId, option: input.optionId });
  }

  private graphql<T>(token: string, query: string, variables: Record<string, unknown>) {
    return githubGraphql<T>(this.transport, token, query, variables);
  }
}
