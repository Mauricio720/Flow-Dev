import type { GitHubWorld, WorldItem } from "./assigned-world";

export function rawItem(item?: WorldItem, assigneeLimit = 100) {
  if (!item) return null;
  const content = item.issue && item.type === "Issue" ? { __typename: "Issue", id: item.issue.id, number: item.issue.number, url: `https://github.com/acme/private/issues/${item.issue.number}`, title: item.issue.title, body: item.issue.body, state: item.issue.state, updatedAt: "2026-10-01T10:00:00Z", repository: { id: item.issue.repositoryNodeId, databaseId: item.issue.repositoryId, name: "private", owner: { login: "acme" } }, assignees: assigneeConnection(item.issue.assignees, null, assigneeLimit) } : { __typename: item.type };
  return { id: item.id, isArchived: item.archived, project: { id: item.project }, status: item.status ? { optionId: item.status } : null, content };
}

function assigneeConnection(ids: number[], after: string | null, limit: number) {
  const start = after ? Number(after) : 0;
  const nodes = ids.slice(start, start + limit).map((databaseId) => ({ databaseId, login: `user${databaseId}` }));
  const end = start + nodes.length;
  return { nodes, pageInfo: { hasNextPage: end < ids.length, endCursor: String(end) } };
}

export function assigneePage(world: GitHubWorld, input: { issueId: string; after: string | null }) {
  const item = [...world.items.values()].find((candidate) => candidate.issue?.id === input.issueId);
  if (!item?.issue) return Response.json({ data: { node: null } });
  return Response.json({ data: { node: { assignees: assigneeConnection(item.issue.assignees, input.after, world.assigneePageSize) } } });
}

export function itemsPage(world: GitHubWorld, input: { after: string | null; first: number }) {
  const all = [...world.items.values()];
  const start = input.after ? Number(input.after) : 0;
  const page = all.slice(start, start + input.first);
  const end = start + page.length;
  const nodes = page.map((item) => rawItem(item, world.assigneePageSize));
  return Response.json({ data: { node: { items: { pageInfo: { hasNextPage: end < all.length, endCursor: String(end) }, nodes } } } });
}

export function applyMutation(world: GitHubWorld, variables: Record<string, unknown>) {
  world.mutations.push(`${variables.item}:${variables.option}`);
  if (world.mutation === "drop") throw new TypeError("connection reset");
  if (world.mutation === "forbidden") return Response.json({ errors: [{ type: "FORBIDDEN" }] });
  if (world.mutation === "rate_limited") return new Response("{}", { status: 429, headers: { "retry-after": "30" } });
  const item = world.items.get(String(variables.item));
  if (item) item.status = String(variables.option);
  world.afterMutation?.();
  if (world.mutation === "applied_then_drop") throw new TypeError("response lost");
  return Response.json({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: variables.item } } } });
}

