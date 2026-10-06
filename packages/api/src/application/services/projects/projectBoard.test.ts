import { describe, expect, it, vi } from "vitest";
import type { ProjectDao, ProjectRecord } from "../../database/dao/projectDao";
import { RepositoryAuthorizationNeededError, RepositoryUnavailableError } from "../../github/repositoryErrors";
import { BacklogPlacementService } from "./backlogPlacementService";
import { BoardBackfillService } from "./boardBackfillService";
import { ProjectValidationError } from "./projectErrors";
import { findBacklogOption, parseBoardUrl } from "./projectBoardRules";
import { ProjectBoardService } from "./projectBoardService";

const board = { nodeId: "PVT_1", url: "https://github.com/orgs/acme/projects/7", title: "Roadmap" };
const project = { id: "p1", externalKey: "p1", name: "Alpha", description: null, isDemo: false, createdAt: new Date(), board } satisfies ProjectRecord;
const admin = { userId: "u1", sessionId: "s1" };
const issue = { taskId: "t1", issueNodeId: "I_1", issueNumber: 41, issueUrl: "https://github.com/acme/cart/issues/41", title: "Corrigir total" };

function projectsWith(record: ProjectRecord | null) {
  return { findById: vi.fn(async () => record), updateBoard: vi.fn(async (_id: string, next: typeof board | null) => record && { ...record, board: next }) } as unknown as ProjectDao & { updateBoard: ReturnType<typeof vi.fn> };
}
function gateway() {
  return { resolve: vi.fn(async () => board), assertBacklog: vi.fn(async () => {}), placeInBacklog: vi.fn(async () => {}), moveToReady: vi.fn(async () => {}), issuePresence: vi.fn(async () => "absent" as "absent" | "present" | "closed") };
}
const permissions = (isAdmin: boolean) => ({ isAdmin: async () => isAdmin }) as never;
const authorization = (token: string | null) => ({ accessToken: async () => token }) as never;

describe("project board rules", () => {
  it("reads organization and user board links, ignoring the view suffix", () => {
    expect(parseBoardUrl(" https://github.com/orgs/acme/projects/7/views/2 ")).toEqual({ ownerKind: "organization", owner: "acme", number: 7 });
    expect(parseBoardUrl("https://github.com/users/octo/projects/12")).toEqual({ ownerKind: "user", owner: "octo", number: 12 });
  });
  it.each(["", "http://github.com/orgs/acme/projects/7", "https://example.com/orgs/acme/projects/7", "https://github.com/acme/cart/projects/7", "https://github.com/orgs/acme/projects/0"])("rejects %s", (value) => {
    expect(() => parseBoardUrl(value)).toThrow(ProjectValidationError);
  });
  it("finds the Backlog status regardless of case", () => {
    expect(findBacklogOption([{ id: "a", name: "Todo" }, { id: "b", name: " BACKLOG " }])?.id).toBe("b");
    expect(findBacklogOption([{ id: "a", name: "Todo" }])).toBeNull();
  });
});

describe("ProjectBoardService", () => {
  it("saves the board resolved with the administrator's own token", async () => {
    const projects = projectsWith(project);
    const boards = gateway();
    const service = new ProjectBoardService({ projects, permissions: permissions(true), authorization: authorization("token"), boards });
    await service.link(admin, { projectId: "p1", boardUrl: board.url });
    expect(boards.resolve).toHaveBeenCalledWith("token", { ownerKind: "organization", owner: "acme", number: 7 });
    expect(projects.updateBoard).toHaveBeenCalledWith("p1", board);
  });
  it("refuses members and clears the board on unlink", async () => {
    const projects = projectsWith(project);
    await expect(new ProjectBoardService({ projects, permissions: permissions(false), authorization: authorization("token"), boards: gateway() }).link(admin, { projectId: "p1", boardUrl: board.url })).rejects.toThrow();
    await new ProjectBoardService({ projects, permissions: permissions(true), authorization: authorization("token"), boards: gateway() }).unlink(admin, "p1");
    expect(projects.updateBoard).toHaveBeenCalledWith("p1", null);
  });
});

describe("BacklogPlacementService", () => {
  it("places the issue on the configured board and retries once", async () => {
    const boards = gateway();
    boards.placeInBacklog.mockRejectedValueOnce(new RepositoryUnavailableError());
    await expect(new BacklogPlacementService(projectsWith(project), boards).place({ projectId: "p1", token: "token", issueNodeId: "I_1" })).resolves.toBe("placed");
    expect(boards.placeInBacklog).toHaveBeenLastCalledWith("token", { boardNodeId: "PVT_1", issueNodeId: "I_1" });
    expect(boards.placeInBacklog).toHaveBeenCalledTimes(2);
  });
  it("does nothing for a project without a board", async () => {
    const boards = gateway();
    await expect(new BacklogPlacementService(projectsWith({ ...project, board: null }), boards).place({ projectId: "p1", token: "token", issueNodeId: "I_1" })).resolves.toBe("no_board");
    expect(boards.placeInBacklog).not.toHaveBeenCalled();
  });
  it("blocks only when the token lacks the board scope", async () => {
    const boards = gateway();
    const service = new BacklogPlacementService(projectsWith(project), boards);
    boards.assertBacklog.mockRejectedValueOnce(new RepositoryUnavailableError());
    await expect(service.assertAuthorized({ projectId: "p1", token: "token" })).resolves.toBeUndefined();
    boards.assertBacklog.mockRejectedValueOnce(new RepositoryAuthorizationNeededError());
    await expect(service.assertAuthorized({ projectId: "p1", token: "token" })).rejects.toThrow(RepositoryAuthorizationNeededError);
  });
});

describe("BoardBackfillService", () => {
  function service(boards: ReturnType<typeof gateway>) {
    return new BoardBackfillService({ projects: projectsWith(project), permissions: permissions(true), issues: { listByProject: async () => [issue] }, authorization: authorization("token"), boards });
  }
  it("only lists what would be added until apply is requested", async () => {
    const boards = gateway();
    expect((await service(boards).run({ projectId: "p1", userId: "u1", apply: false })).items[0]?.action).toBe("to_add");
    expect(boards.placeInBacklog).not.toHaveBeenCalled();
    expect((await service(boards).run({ projectId: "p1", userId: "u1", apply: true })).items[0]?.action).toBe("added");
  });
  it("leaves issues already on the board and closed issues untouched", async () => {
    const boards = gateway();
    boards.issuePresence.mockResolvedValueOnce("present").mockResolvedValueOnce("closed");
    expect((await service(boards).run({ projectId: "p1", userId: "u1", apply: true })).items[0]?.action).toBe("already_present");
    expect((await service(boards).run({ projectId: "p1", userId: "u1", apply: true })).items[0]?.action).toBe("closed");
    expect(boards.placeInBacklog).not.toHaveBeenCalled();
  });
});
