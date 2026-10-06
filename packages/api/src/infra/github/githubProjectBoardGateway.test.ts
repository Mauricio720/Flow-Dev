import { describe, expect, it, vi } from "vitest";
import { BacklogStatusMissingError, ProjectBoardNotFoundError, ReadyStatusMissingError } from "../../application/github/projectBoardGateway";
import { RepositoryAuthorizationNeededError } from "../../application/github/repositoryErrors";
import { GitHubHttpProjectBoardGateway } from "./githubProjectBoardGateway";

const status = { id: "FIELD_1", options: [{ id: "OPT_TODO", name: "Todo" }, { id: "OPT_BACKLOG", name: "Backlog" }] };
const boardNode = { id: "PVT_1", title: "Roadmap", url: "https://github.com/orgs/acme/projects/7", closed: false, field: status };
const reference = { ownerKind: "organization" as const, owner: "acme", number: 7 };

function gatewayReturning(...bodies: unknown[]) {
  const fetcher = vi.fn();
  bodies.forEach((body) => fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 })));
  return { gateway: new GitHubHttpProjectBoardGateway(fetcher as unknown as typeof fetch), fetcher };
}
function sent(fetcher: ReturnType<typeof vi.fn>, call: number) { return JSON.parse(fetcher.mock.calls[call]![1].body as string) as { query: string; variables: Record<string, unknown> }; }

describe("GitHubHttpProjectBoardGateway", () => {
  it("resolves an organization board that has a Backlog status", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { owner: { projectV2: boardNode } } });
    await expect(gateway.resolve("token", reference)).resolves.toEqual({ nodeId: "PVT_1", url: boardNode.url, title: "Roadmap" });
    expect(sent(fetcher, 0).query).toContain("organization(login:$login)");
    expect(sent(fetcher, 0).variables).toEqual({ login: "acme", number: 7 });
  });
  it("rejects a board without Backlog, a closed board and a missing board", async () => {
    await expect(gatewayReturning({ data: { owner: { projectV2: { ...boardNode, field: { id: "FIELD_1", options: [{ id: "x", name: "Todo" }] } } } } }).gateway.resolve("token", reference)).rejects.toThrow(BacklogStatusMissingError);
    await expect(gatewayReturning({ data: { owner: { projectV2: { ...boardNode, closed: true } } } }).gateway.resolve("token", reference)).rejects.toThrow(ProjectBoardNotFoundError);
    await expect(gatewayReturning({ data: { owner: null }, errors: [{ type: "NOT_FOUND" }] }).gateway.resolve("token", reference)).rejects.toThrow(ProjectBoardNotFoundError);
  });
  it("asks for a new authorization when the token lacks the project scope", async () => {
    await expect(gatewayReturning({ errors: [{ type: "INSUFFICIENT_SCOPES" }] }).gateway.assertBacklog("token", "PVT_1")).rejects.toThrow(RepositoryAuthorizationNeededError);
  });
  it("adds the issue to the board and sets its status to Backlog", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { node: boardNode } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "ITEM_1" } } } });
    await gateway.placeInBacklog("token", { boardNodeId: "PVT_1", issueNodeId: "I_1" });
    expect(sent(fetcher, 1).variables).toEqual({ board: "PVT_1", content: "I_1" });
    expect(sent(fetcher, 2).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_1", option: "OPT_BACKLOG" });
  });
  it("writes the priority points to the numeric priority field of the board", async () => {
    const prioritized = { ...boardNode, prioridade: { id: "FIELD_P", dataType: "NUMBER" } };
    const { gateway, fetcher } = gatewayReturning({ data: { node: prioritized } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} }, { data: {} });
    await gateway.placeInBacklog("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", priorityPoints: 4 });
    expect(sent(fetcher, 3).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_P", points: 4 });
  });
  it("skips the priority points when the board has no numeric priority field", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { node: { ...boardNode, priority: {} } } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} });
    await gateway.placeInBacklog("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", priorityPoints: 4 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("moves an issue already on the board to the Ready status", async () => {
    const withReady = { ...boardNode, field: { id: "FIELD_1", options: [...status.options, { id: "OPT_READY", name: " Ready " }] } };
    const { gateway, fetcher } = gatewayReturning({ data: { node: withReady } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} });
    await gateway.moveToReady("token", { boardNodeId: "PVT_1", issueNodeId: "I_1" });
    expect(sent(fetcher, 1).variables).toEqual({ board: "PVT_1", content: "I_1" });
    expect(sent(fetcher, 2).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_1", option: "OPT_READY" });
  });
  it("changes nothing on a board without the Ready status", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { node: boardNode } });
    await expect(gateway.moveToReady("token", { boardNodeId: "PVT_1", issueNodeId: "I_1" })).rejects.toThrow(ReadyStatusMissingError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports whether an issue is already on the board or closed", async () => {
    const target = { boardNodeId: "PVT_1", issueNodeId: "I_1" };
    await expect(gatewayReturning({ data: { node: { state: "OPEN", projectItems: { nodes: [{ project: { id: "PVT_1" } }] } } } }).gateway.issuePresence("token", target)).resolves.toBe("present");
    await expect(gatewayReturning({ data: { node: { state: "CLOSED", projectItems: { nodes: [] } } } }).gateway.issuePresence("token", target)).resolves.toBe("closed");
    await expect(gatewayReturning({ data: { node: { state: "OPEN", projectItems: { nodes: [{ project: { id: "PVT_9" } }] } } } }).gateway.issuePresence("token", target)).resolves.toBe("absent");
  });
});
