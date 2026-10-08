import { describe, expect, it, vi } from "vitest";
import { GitHubHttpAssignedIssueGateway } from "./githubAssignedIssueGateway";
import { RepositoryRateLimitedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

const issueNode = { id: "I1", number: 1, url: "u", title: "t", body: "b", state: "OPEN", updatedAt: "2026-10-01T00:00:00Z", repository: { id: "R1", databaseId: 101, name: "flow", owner: { login: "acme" } }, assignees: { nodes: [{ databaseId: 7, login: "u" }], pageInfo: { hasNextPage: true, endCursor: "c1" } } };
const itemNode = { id: "PVTI1", isArchived: false, project: { id: "board" }, status: { optionId: "ready" }, content: { __typename: "Issue", ...issueNode } };
const respond = (payload: unknown, init?: ResponseInit) => vi.fn<typeof fetch>(async () => Response.json(payload, init));

describe("GitHubHttpAssignedIssueGateway", () => {
  it("maps ProjectV2 items, status option and assignee paging facts", async () => {
    const gateway = new GitHubHttpAssignedIssueGateway(respond({ data: { node: { items: { pageInfo: { hasNextPage: true, endCursor: "next" }, nodes: [itemNode, null, { id: "PVTI2", content: { __typename: "PullRequest" } }] } } } }));
    const page = await gateway.itemsPage("token", { boardNodeId: "board", after: null, first: 50 });
    expect(page).toMatchObject({ hasNextPage: true, endCursor: "next" });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({ itemId: "PVTI1", boardNodeId: "board", statusOptionId: "ready", issue: { nodeId: "I1", repositoryId: "101", assignees: [{ githubId: "7" }], assigneesHasNextPage: true, assigneesCursor: "c1" } });
    expect(page.items[1]).toMatchObject({ contentType: "PullRequest", issue: null });
  });

  it("UT-087 reports provider_unavailable when GraphQL returns errors beside partial data", async () => {
    const gateway = new GitHubHttpAssignedIssueGateway(respond({ data: { node: { items: { pageInfo: {}, nodes: [itemNode] } } }, errors: [{ type: "SOMETHING" }] }));
    await expect(gateway.itemsPage("token", { boardNodeId: "board", after: null, first: 50 })).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it("surfaces rate limits with retry-after and never an empty page", async () => {
    const gateway = new GitHubHttpAssignedIssueGateway(vi.fn<typeof fetch>(async () => new Response("{}", { status: 429, headers: { "retry-after": "30" } })));
    const error = await gateway.itemsPage("token", { boardNodeId: "board", after: null, first: 50 }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RepositoryRateLimitedError);
    expect(error).toMatchObject({ retryAfterSeconds: 30 });
  });

  it("returns null for a missing item and sends the exact status mutation variables", async () => {
    const fetcher = respond({ data: { node: null } });
    const gateway = new GitHubHttpAssignedIssueGateway(fetcher);
    expect(await gateway.item("token", "missing")).toBeNull();
    await new GitHubHttpAssignedIssueGateway(respond({ data: { updateProjectV2ItemFieldValue: {} } })).setStatus("token", { boardNodeId: "board", itemId: "PVTI1", fieldId: "field", optionId: "opt" });
  });
});
