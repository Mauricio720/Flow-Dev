import { describe, expect, it } from "vitest";
import { createCallerFactory } from "../trpc";
import { createProjectsRouter } from "./projects";
import type { ProjectsController } from "../controllers/projectsController";

const dto = { id: "00000000-0000-4000-8000-000000000001", name: "Alpha", description: null, repository: { githubId: "202", nodeId: "R_202", owner: "acme", name: "private", visibility: "private", archived: false }, detailsVersion: 1, isDemo: false, board: null };
const controller = { list: async () => ({ items: [dto], nextCursor: null }), byId: async () => dto, select: async () => dto, candidates: async () => ({ items: [{ repository: dto.repository, linkedProjectId: dto.id }], nextCursor: null }), preview: async () => ({ repository: dto.repository, linkedProjectId: dto.id }), create: async () => dto, updateDetails: async () => ({ ...dto, detailsVersion: 2 }), updateBoard: async (_actor: unknown, input: { boardUrl: string | null }) => ({ ...dto, board: input.boardUrl ? { url: input.boardUrl, title: "Roadmap" } : null }), connectionStates: async () => [{ projectId: dto.id, kind: "available" as const }], repositoryContext: async () => ({ repository: dto.repository, defaultBranch: "main" }) } as unknown as ProjectsController;
const caller = createCallerFactory(createProjectsRouter(controller));
const context = { principal: { userId: "u1" }, requestId: "test", responseHeaders: undefined };

describe("protected project router", () => {
  it("UT-047 and IT-046 lists through the session principal", async () => { const result = await caller(context).list({}); expect(result.items[0]?.repository.githubId).toBe("202"); });
  it("UT-048 and IT-047 reject forbidden fields and invalid cursors", async () => { await expect(caller(context).updateDetails({ projectId: dto.id, name: "Alpha", description: null, expectedVersion: 1, githubRepositoryId: "303" } as never)).rejects.toThrow(); await expect(caller(context).list({ cursor: "broken" })).rejects.toThrow(); });
  it("IT-048 and IT-049 returns and selects a visible project", async () => { expect((await caller(context).byId({ projectId: dto.id })).repository.githubId).toBe("202"); expect((await caller(context).select({ projectId: dto.id })).id).toBe(dto.id); });
  it("IT-050 and IT-051 exposes linked repository metadata", async () => { expect((await caller(context).repositoryCandidates({})).items[0]?.linkedProjectId).toBe(dto.id); expect((await caller(context).repositoryPreview({ owner: "acme", name: "private" })).repository.nodeId).toBe("R_202"); });
  it("IT-052 and IT-053 creates and edits without repository input", async () => { expect((await caller(context).create({ name: "Alpha", nodeId: "R_202" })).isDemo).toBe(false); expect((await caller(context).updateDetails({ projectId: dto.id, name: "Beta", description: null, expectedVersion: 1 })).detailsVersion).toBe(2); });
  it("links and unlinks the GitHub board through a bounded URL", async () => { expect((await caller(context).updateBoard({ projectId: dto.id, boardUrl: "https://github.com/orgs/acme/projects/7" })).board?.title).toBe("Roadmap"); expect((await caller(context).updateBoard({ projectId: dto.id, boardUrl: null })).board).toBeNull(); await expect(caller(context).updateBoard({ projectId: dto.id, boardUrl: "" })).rejects.toThrow(); });
  it("IT-054, IT-055 and IT-071 returns safe connection context", async () => { expect((await caller(context).connectionStates({ projectIds: [dto.id] }))[0]?.kind).toBe("available"); expect((await caller(context).repositoryContext({ projectId: dto.id })).defaultBranch).toBe("main"); await expect(caller(context).create({ name: " ", nodeId: "R_202" })).rejects.toThrow(); });
});
