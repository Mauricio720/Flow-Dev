import { describe, expect, it, vi } from "vitest";
import type { AssignedIssueGateway, BoardItemFacts } from "../../github/assignedIssueGateway";
import { AssignedIssueDiscovery } from "./assignedIssueDiscovery";
import { AssignedIssueVerifier } from "./assignedIssueVerifier";

const actor = { userId: "30000000-0000-4000-8000-000000000001" };
const input = { projectId: "10000000-0000-4000-8000-000000000001", limit: 20 };
const context = (board: { nodeId: string } | null = { nodeId: "board" }) => ({ project: {}, repository: { githubId: "101", nodeId: "R1" }, token: "token", githubUserId: "1001", board });
const field = { fieldId: "field", options: [{ id: "ready", name: "Ready" }, { id: "progress", name: "In Progress" }] };
const other = (id: string): BoardItemFacts => ({ itemId: id, boardNodeId: "board", archived: false, contentType: "Issue", statusOptionId: "backlog", issue: { nodeId: id, number: 1, url: "u", title: "t", body: "b", state: "OPEN", updatedAt: "2026-10-01T00:00:00Z", repositoryNodeId: "R1", repositoryId: "101", repositoryOwner: "a", repositoryName: "f", assignees: [], assigneesHasNextPage: false, assigneesCursor: null } });

function discovery(pages: { items: BoardItemFacts[]; hasNextPage: boolean; endCursor: string | null }[], board: { nodeId: string } | null = { nodeId: "board" }) {
  const itemsPage = vi.fn(async () => pages.shift()!);
  const gateway = { statusField: vi.fn(async () => field), itemsPage, item: vi.fn(), assignees: vi.fn(), setStatus: vi.fn() } as unknown as AssignedIssueGateway;
  const repositories = { personalContext: vi.fn(async () => context(board)) };
  return { service: new AssignedIssueDiscovery(repositories as never, gateway, new AssignedIssueVerifier(gateway)), itemsPage };
}

describe("AssignedIssueDiscovery.list", () => {
  it("UT-017 reports board_missing instead of an empty queue when no board is linked", async () => {
    const { service, itemsPage } = discovery([], null);
    await expect(service.list(actor, input)).rejects.toMatchObject({ reason: "board_missing" });
    expect(itemsPage).not.toHaveBeenCalled();
  });

  it("UT-019 keeps scanning with a continuation cursor when two pages hold no eligible issues", async () => {
    const pages = [{ items: [other("I1")], hasNextPage: true, endCursor: "c1" }, { items: [other("I2")], hasNextPage: true, endCursor: "c2" }, { items: [], hasNextPage: false, endCursor: null }];
    const { service, itemsPage } = discovery(pages);
    const page = await service.list(actor, input);
    expect(itemsPage).toHaveBeenCalledTimes(2);
    expect(page).toMatchObject({ items: [], availability: "scan_continuing" });
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it("reports empty only after the final page", async () => {
    const { service } = discovery([{ items: [other("I1")], hasNextPage: false, endCursor: null }]);
    expect(await service.list(actor, input)).toMatchObject({ items: [], nextCursor: null, availability: "empty" });
  });

  it("rejects a cursor bound to another project or actor", async () => {
    const { service } = discovery([{ items: [other("I1")], hasNextPage: true, endCursor: "c1" }, { items: [], hasNextPage: true, endCursor: "c2" }]);
    const { nextCursor } = await service.list(actor, input);
    const again = discovery([]);
    await expect(again.service.list({ userId: "other" }, { ...input, cursor: nextCursor! })).rejects.toMatchObject({ reason: "invalid_cursor" });
    await expect(again.service.list(actor, { ...input, cursor: "not-a-cursor" })).rejects.toMatchObject({ reason: "invalid_cursor" });
  });
});
