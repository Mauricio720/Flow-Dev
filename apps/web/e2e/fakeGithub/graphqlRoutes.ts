import { FAKE_BOARD } from "./fakeBoard";
import { assigneesOf, deletableIssueNode, itemNode, repositoryNode, type FakeGithubData } from "./fakeGithubData";

type GraphqlRequest = { query: string; variables: Record<string, unknown> };
type GraphqlReply = { data?: unknown; errors?: { type: string; message: string }[] };
type Route = { matches: (query: string) => boolean; answer: (data: FakeGithubData, variables: Record<string, unknown>) => Promise<GraphqlReply> };

const NOT_FOUND: GraphqlReply = { errors: [{ type: "NOT_FOUND", message: "Could not resolve to a node" }] };
const boardNode = { id: FAKE_BOARD.nodeId, title: FAKE_BOARD.title, url: FAKE_BOARD.url, closed: false, field: { id: FAKE_BOARD.statusFieldId, options: FAKE_BOARD.options }, fields: { nodes: [] } };

function nodeOrNotFound(node: unknown): GraphqlReply {
  return node ? { data: { node } } : NOT_FOUND;
}

const ROUTES: Route[] = [
  { matches: (query) => query.includes("... on Repository"), answer: async (data, variables) => { const row = await data.repositoryByNodeId(String(variables.id)); return nodeOrNotFound(row && repositoryNode(row)); } },
  { matches: (query) => query.includes("... on ProjectV2Item"), answer: async (data, variables) => { const row = await data.itemById(String(variables.id)); return nodeOrNotFound(row && itemNode(row)); } },
  { matches: (query) => query.includes("... on ProjectV2 {") && query.includes("items("), answer: async (data) => ({ data: { node: { items: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: (await data.boardItems()).map(itemNode) } } } }) },
  { matches: (query) => query.includes("... on ProjectV2 {"), answer: async () => ({ data: { node: boardNode } }) },
  { matches: (query) => query.includes("projectV2(number:"), answer: async () => ({ data: { owner: { projectV2: boardNode } } }) },
  { matches: (query) => query.includes("... on Issue { assignees"), answer: async (data, variables) => { const row = await data.itemByIssueNodeId(String(variables.id)); return nodeOrNotFound(row && { assignees: assigneesOf(row) }); } },
  { matches: (query) => query.includes("viewerCanDelete"), answer: async (data, variables) => { const row = await data.itemByIssueNodeId(String(variables.id)); return nodeOrNotFound(row && deletableIssueNode(row)); } },
  { matches: (query) => query.includes("deleteIssue("), answer: async () => ({ data: { deleteIssue: { clientMutationId: null } } }) },
  { matches: (query) => query.includes("projectItems("), answer: async () => ({ data: { node: { state: "OPEN", projectItems: { nodes: [{ project: { id: FAKE_BOARD.nodeId } }] } } } }) },
  { matches: (query) => query.includes("addProjectV2ItemById"), answer: async () => ({ data: { addProjectV2ItemById: { item: { id: `PVTI_added_${Date.now()}` } } } }) },
  { matches: (query) => query.includes("updateProjectV2ItemFieldValue"), answer: async (_data, variables) => ({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: variables.item } } } }) },
];

export async function answerGraphql(data: FakeGithubData, request: GraphqlRequest): Promise<GraphqlReply | null> {
  const route = ROUTES.find((candidate) => candidate.matches(request.query));
  return route ? route.answer(data, request.variables ?? {}) : null;
}
