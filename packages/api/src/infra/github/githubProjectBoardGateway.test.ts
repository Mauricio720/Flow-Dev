import { describe, expect, it, vi } from "vitest";
import { BacklogStatusMissingError, BoardStatusMissingError, ProjectBoardNotFoundError } from "../../application/github/projectBoardGateway";
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
  it("resolves a board through one query that never looks a priority field up by name", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { owner: { projectV2: { ...boardNode, fields: { nodes: [{}] } } } } });
    await expect(gateway.resolve("token", reference)).resolves.toMatchObject({ nodeId: "PVT_1" });
    expect(sent(fetcher, 0).query).not.toMatch(/field\(name:"Priori/);
  });
  it("asks for a new authorization when the token lacks the project scope", async () => {
    await expect(gatewayReturning({ errors: [{ type: "INSUFFICIENT_SCOPES" }] }).gateway.statuses("token", "PVT_1")).rejects.toThrow(RepositoryAuthorizationNeededError);
  });
  it("lists configured Backlog and Ready statuses", async () => {
    const { gateway } = gatewayReturning({ data: { node: { ...boardNode, field: { ...status, options: [...status.options, { id: "OPT_READY", name: " Ready " }] } } } });
    await expect(gateway.statuses("token", "PVT_1")).resolves.toEqual(["backlog", "ready"]);
  });
  it("adds the issue to the board and sets the requested status", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { node: boardNode } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "ITEM_1" } } } });
    await gateway.place("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", status: "backlog" });
    expect(sent(fetcher, 1).variables).toEqual({ board: "PVT_1", content: "I_1" });
    expect(sent(fetcher, 2).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_1", option: "OPT_BACKLOG" });
  });
  it("writes the priority points to the numeric priority field of the board", async () => {
    const prioritized = { ...boardNode, fields: { nodes: [{}, { id: "FIELD_S", name: "Priority", dataType: "SINGLE_SELECT" }, { id: "FIELD_P", name: "Prioridade", dataType: "NUMBER" }] } };
    const { gateway, fetcher } = gatewayReturning({ data: { node: prioritized } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} }, { data: {} });
    await gateway.place("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", priorityPoints: 4, status: "backlog" });
    expect(sent(fetcher, 3).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_P", points: 4 });
  });
  it("skips the priority points when the board has no numeric priority field", async () => {
    const { gateway, fetcher } = gatewayReturning({ data: { node: { ...boardNode, fields: { nodes: [{}, { id: "FIELD_E", name: "Estimate", dataType: "NUMBER" }] } } } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} });
    await gateway.place("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", priorityPoints: 4, status: "backlog" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("uses Ready's option id and rejects a missing Ready without mutation", async () => {
    const readyBoard = { ...boardNode, field: { ...status, options: [...status.options, { id: "OPT_READY", name: "Ready" }] } };
    const { gateway, fetcher } = gatewayReturning({ data: { node: readyBoard } }, { data: { addProjectV2ItemById: { item: { id: "ITEM_1" } } } }, { data: {} });
    await gateway.place("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", priorityPoints: 5, status: "ready" });
    expect(sent(fetcher, 2).variables).toEqual({ board: "PVT_1", item: "ITEM_1", field: "FIELD_1", option: "OPT_READY" });
    await expect(gatewayReturning({ data: { node: boardNode } }).gateway.place("token", { boardNodeId: "PVT_1", issueNodeId: "I_1", status: "ready" })).rejects.toMatchObject({ constructor: BoardStatusMissingError, status: "ready" });
  });
  it("reports whether an issue is already on the board or closed", async () => {
    const target = { boardNodeId: "PVT_1", issueNodeId: "I_1" };
    await expect(gatewayReturning({ data: { node: { state: "OPEN", projectItems: { nodes: [{ project: { id: "PVT_1" } }] } } } }).gateway.issuePresence("token", target)).resolves.toBe("present");
    await expect(gatewayReturning({ data: { node: { state: "CLOSED", projectItems: { nodes: [] } } } }).gateway.issuePresence("token", target)).resolves.toBe("closed");
    await expect(gatewayReturning({ data: { node: { state: "OPEN", projectItems: { nodes: [{ project: { id: "PVT_9" } }] } } } }).gateway.issuePresence("token", target)).resolves.toBe("absent");
  });
});
