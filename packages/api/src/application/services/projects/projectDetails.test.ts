import { describe, expect, it } from "vitest";
import type { ProjectDao, ProjectRecord, RepositoryIdentity, VersionedProjectEdit } from "../../database/dao/projectDao";
import { isUniqueViolation } from "../../../infra/database/dao/projects/projectRecordMapper";
import { ProjectConflictError, StaleProjectVersionError, projectConflictKind } from "./projectErrors";
import { ProjectLifecycleService } from "./projectLifecycleService";

const actor = { userId: "admin" };
const permissions = { isAdmin: async () => true };
const authorization = { accessToken: async () => "token" };
const privateRepository: RepositoryIdentity = { githubId: "202", nodeId: "R_202", owner: "acme", name: "private", visibility: "private", archived: false };
const docsRepository: RepositoryIdentity = { githubId: "101", nodeId: "R_101", owner: "octo", name: "docs", visibility: "public", archived: false };

function record(id: string, name: string, repository = privateRepository): ProjectRecord {
  return { id, externalKey: `project-${id}`, name, description: "Antiga", isDemo: false, createdAt: new Date(), repository, detailsVersion: 3 };
}

function detailsDao(rows: ProjectRecord[]) {
  const received: VersionedProjectEdit[] = [];
  const updateDetails = async (input: VersionedProjectEdit) => {
    received.push(input);
    const taken = rows.some((row) => row.id !== input.projectId && row.name.toLowerCase() === input.name.toLowerCase());
    if (taken) throw new ProjectConflictError("Project name already exists");
    const current = rows.find((row) => row.id === input.projectId)!;
    return { ...current, name: input.name, description: input.description, detailsVersion: input.expectedVersion + 1 };
  };
  return { received, dao: { updateDetails, findById: async (id: string) => rows.find((row) => row.id === id) ?? null } as unknown as ProjectDao };
}

function serviceFor(dao: ProjectDao, github: object = {}) {
  return new ProjectLifecycleService(dao, permissions as never, github as never, authorization as never);
}

describe("project details", () => {
  it("UT-010 normalizes the name and reports a case-insensitive conflict with another project, keeping the stored version", async () => {
    const rows = [record("p1", "Alpha"), record("p2", "projeto", docsRepository)];
    const { dao, received } = detailsDao(rows);
    const edit = serviceFor(dao).updateDetails(actor, { projectId: "p1", name: " Projeto ", description: null, expectedVersion: 3 });
    await expect(edit).rejects.toSatisfy((error) => projectConflictKind(error) === "name");
    expect(received[0]?.name).toBe("Projeto");
    expect(rows[0]).toMatchObject({ name: "Alpha", detailsVersion: 3 });
  });

  it("UT-011 stores a cleared description as null and keeps repository 202", async () => {
    const { dao, received } = detailsDao([record("p1", "Alpha")]);
    const saved = await serviceFor(dao).updateDetails(actor, { projectId: "p1", name: "Alpha", description: "", expectedVersion: 3 });
    expect(received[0]?.description).toBeNull();
    expect(saved).toMatchObject({ description: null, detailsVersion: 4, repository: { githubId: "202" } });
  });

  it("tells repository, name and version conflicts apart for the transport layer", () => {
    expect(projectConflictKind(new ProjectConflictError("linked", "p1"))).toBe("repository");
    expect(projectConflictKind(new ProjectConflictError("name"))).toBe("name");
    expect(projectConflictKind(new StaleProjectVersionError())).toBe("version");
    expect(projectConflictKind(new Error("other"))).toBeUndefined();
  });

  it("recognizes a unique violation wrapped by the query layer", () => {
    expect(isUniqueViolation(new Error("query failed", { cause: { code: "23505" } }))).toBe(true);
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("query failed", { cause: { code: "23503" } }))).toBe(false);
  });

  it("filters each candidate batch by the search term and keeps the continuation cursor", async () => {
    const github = { listAccessible: async () => ({ items: [privateRepository, docsRepository], nextCursor: "Mg" }) };
    const service = serviceFor({} as ProjectDao, github);
    expect(await service.repositoryCandidates(actor, { search: " OCTO/do " })).toEqual({ items: [docsRepository], nextCursor: "Mg" });
    expect(await service.repositoryCandidates(actor, { search: "nada" })).toEqual({ items: [], nextCursor: "Mg" });
    expect((await service.repositoryCandidates(actor, {})).items).toHaveLength(2);
  });
});
