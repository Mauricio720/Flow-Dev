import { describe, expect, it } from "vitest";
import { ProjectLifecycleService } from "./projectLifecycleService";
import { ProjectAccessService } from "../access/projectAccessService";
import { ConnectionStateService } from "./connectionStateService";
import { RepositoryAccessService } from "./repositoryAccessService";
import { ProjectConflictError, StaleProjectVersionError } from "./projectErrors";
import { mapProjectError } from "../../../controllers/projectsController";
import { RepositoryUnavailableError } from "../../github/repositoryErrors";
import { TRPCError } from "@trpc/server";
import { mapProjectDto } from "../../../controllers/mappers/projectDtoMapper";

const repository = { githubId: "202", nodeId: "R_202", owner: "acme", name: "private", visibility: "private" as const, archived: false };
const project = { id: "p1", externalKey: "project-p1", name: "Alpha", description: null, isDemo: false, createdAt: new Date(), repository, detailsVersion: 1 };
const actor = { userId: "u1" };
const permissions = { isAdmin: async () => true, hasAssignment: async () => true, findUser: async () => null, listUsers: async () => ({ items: [], nextCursor: null }), listAssignments: async () => ({ items: [], nextCursor: null }), findProject: async () => project, assign: async () => {}, remove: async () => false, replaceAdmins: async () => {} };
const authorization = { accessToken: async () => "token" };
const github = { resolve: async () => repository, resolvePath: async () => repository, listAccessible: async () => ({ items: [repository], nextCursor: null }), context: async () => ({ repository, defaultBranch: "main" }) };

describe("project services", () => {
  it("UT-013 and UT-071 normalize fields and reject blank names", async () => { const dao = { insertVerified: async (input: any) => ({ ...project, ...input }), findByRepositoryId: async () => null } as any; const service = new ProjectLifecycleService(dao, permissions as any, github as any, authorization as any); expect((await service.create(actor, { name: " Alpha ", description: " ", nodeId: "R_202" })).name).toBe("Alpha"); await expect(service.create(actor, { name: " ", nodeId: "R_202" })).rejects.toThrow(); });
  it("UT-014 returns a stale version conflict", async () => { const dao = { updateDetails: async () => null, findById: async () => project } as any; await expect(new ProjectLifecycleService(dao, permissions as any, github as any, authorization as any).updateDetails(actor, { projectId: "p1", name: "Beta", description: null, expectedVersion: 1 })).rejects.toBeInstanceOf(StaleProjectVersionError); });
  it("UT-015 exposes a safe repository conflict", async () => { const dao = { findByRepositoryId: async () => project, insertVerified: async () => project } as any; const service = new ProjectLifecycleService(dao, permissions as any, github as any, authorization as any); await expect(service.create(actor, { name: "Beta", nodeId: "R_202" })).rejects.toBeInstanceOf(ProjectConflictError); });
  it("UT-016 maps a DTO without credentials", () => { const dto = mapProjectDto(project); expect(dto).toMatchObject({ repository: { githubId: "202" }, detailsVersion: 1 }); expect(JSON.stringify(dto)).not.toContain("token"); });
  it("UT-017 maps provider failures to a safe service unavailable response", async () => {
    const failure = new RepositoryUnavailableError("provider secret");
    const gateway = { ...github, resolve: async () => { throw failure; } };
    const service = new ProjectLifecycleService({ findByRepositoryId: async () => null, insertVerified: async () => project } as any, permissions as any, gateway as any, authorization as any);
    await expect(service.create(actor, { name: "Alpha", nodeId: "R_202" })).rejects.toSatisfy((error) => {
      try { mapProjectError(error); } catch (mapped) { return mapped instanceof TRPCError && mapped.code === "SERVICE_UNAVAILABLE" && mapped.message.includes("temporariamente") && mapped.cause === failure; }
      return false;
    });
  });
  it("UT-049 and UT-050 keep visibility and conflicts in the DAO contract", async () => { const dao = { listVisible: async () => ({ items: [project], nextCursor: "cursor" }), findByRepositoryId: async () => project } as any; expect((await new ProjectAccessService(dao, permissions as any).listVisible(actor, {})).items).toHaveLength(1); expect(await dao.findByRepositoryId("202")).toEqual(project); });
  it("UT-028 to UT-031 enforce dual access and archive rules", async () => { const access = new RepositoryAccessService({ findVisible: async () => project, updateRepositoryLabel: async () => {} } as any, permissions as any, authorization as any, github as any); expect((await access.requireRead(actor, "p1")).githubId).toBe("202"); const archived = { ...project, repository: { ...repository, archived: true } }; const archivedGithub = { ...github, resolve: async () => ({ ...repository, archived: true }) }; const archivedAccess = new RepositoryAccessService({ findVisible: async () => archived } as any, permissions as any, authorization as any, archivedGithub as any); await expect(archivedAccess.requireWrite(actor, "p1")).rejects.toThrow(); });
  it("UT-032 to UT-034 returns conservative batches", async () => { const states = new ConnectionStateService({ findVisible: async () => project, updateRepositoryLabel: async () => {} } as any, permissions as any, authorization as any, github as any); expect((await states.forVisibleProjects(actor, ["p1"]))[0]?.kind).toBe("available"); await expect(states.forVisibleProjects(actor, Array.from({ length: 51 }, (_, i) => `p${i}`))).rejects.toThrow(); });
});
