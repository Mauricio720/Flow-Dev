export type BoardAssignee = { githubId: string; login: string | null };
export type BoardIssueContent = {
  nodeId: string | null;
  number: number | null;
  url: string | null;
  title: string | null;
  body: string | null;
  state: string | null;
  updatedAt: string | null;
  repositoryNodeId: string | null;
  repositoryId: string | null;
  repositoryOwner: string | null;
  repositoryName: string | null;
  assignees: BoardAssignee[];
  assigneesHasNextPage: boolean;
  assigneesCursor: string | null;
};
export type BoardItemFacts = {
  itemId: string;
  boardNodeId: string | null;
  archived: boolean;
  contentType: string | null;
  statusOptionId: string | null;
  issue: BoardIssueContent | null;
};
export type BoardItemsPage = { items: BoardItemFacts[]; hasNextPage: boolean; endCursor: string | null };
export type AssigneePage = { assignees: BoardAssignee[]; hasNextPage: boolean; endCursor: string | null };
export type StatusOption = { id: string; name: string };
export type StatusField = { fieldId: string; options: StatusOption[] };
export type StatusMutation = { boardNodeId: string; itemId: string; fieldId: string; optionId: string };

export interface AssignedIssueGateway {
  statusField(token: string, boardNodeId: string): Promise<StatusField>;
  itemsPage(token: string, input: { boardNodeId: string; after: string | null; first: number }): Promise<BoardItemsPage>;
  item(token: string, itemId: string): Promise<BoardItemFacts | null>;
  assignees(token: string, input: { issueNodeId: string; after: string | null }): Promise<AssigneePage>;
  setStatus(token: string, input: StatusMutation): Promise<void>;
}
