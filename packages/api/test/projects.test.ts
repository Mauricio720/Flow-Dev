import { afterEach, describe, expect, it } from "vitest";
import { fixture, repository, type Fixture } from "./fixture";

let current: Fixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("project contracts with PostgreSQL and controlled GitHub", () => {
  it("IT-046 and IT-049 enforce admin and member visibility and save selection", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    expect((await current.caller(current.admin.id).list({})).items).toHaveLength(1);
    expect((await current.caller(current.member.id).list({})).items.map((item) => item.id)).toEqual([project.id]);
    await current.caller(current.member.id).select({ projectId: project.id });
    expect((await current.client`SELECT last_project_id FROM users WHERE id = ${current.member.id}`)[0]?.last_project_id).toBe(project.id);
  });
  it("IT-047/048 rejects invalid cursors and returns a credential free DTO", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    await expect(current.caller(current.member.id).list({ cursor: "broken" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const dto = await current.caller(current.member.id).byId({ projectId: project.id });
    expect(dto.repository?.githubId).toBe(repository.githubId);
    expect(JSON.stringify(dto)).not.toContain("access_test");
  });
  it("IT-001 searches a full owner/repository path through the PostgreSQL catalog", async () => {
    current = await fixture();
    const project = await current.project(repository);
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    expect((await current.caller(current.member.id).list({ search: "acme/private" })).items.map((item) => item.id)).toEqual([project.id]);
  });
  it("UT-049 uses stable DAO pagination over PostgreSQL rows", async () => {
    current = await fixture();
    const first = await current.project(repository, "Alpha");
    const second = await current.project({ ...repository, githubId: "303", nodeId: "R_303", name: "other" }, "Beta");
    await current.permissions.assign(current.member.id, first.id, current.admin.id);
    await current.permissions.assign(current.member.id, second.id, current.admin.id);
    const page = await current.dao.listVisible(current.member.id, { limit: 1 });
    expect(page.items.map((item) => item.id)).toEqual([first.id]);
    expect(page.nextCursor).toBeTruthy();
    expect((await current.dao.listVisible(current.member.id, { cursor: page.nextCursor ?? undefined, limit: 1 })).items.map((item) => item.id)).toEqual([second.id]);
  });
  it("UT-050 translates a PostgreSQL unique repository conflict", async () => {
    current = await fixture();
    await current.project();
    await expect(current.dao.insertVerified({ name: "Again", description: null, repository })).rejects.toMatchObject({ existingProjectId: expect.any(String) });
  });
  it("UT-029 checks assignment before contacting GitHub", async () => {
    current = await fixture();
    const project = await current.project();
    await current.authorize(current.member.id);
    await expect(current.caller(current.member.id).repositoryContext({ projectId: project.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(current.fetcher).not.toHaveBeenCalled();
  });
  it("UT-030 preserves identity when the old path is reused after a rename", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    await current.authorize(current.member.id);
    current.fetcher.mockImplementation(async (url) => {
      const identity = String(url).endsWith("/graphql") ? repository : { ...repository, githubId: "303", nodeId: "R_303" };
      if (String(url).endsWith("/graphql")) return Response.json({ data: { node: { databaseId: Number(identity.githubId), id: identity.nodeId, name: identity.name, owner: { login: identity.owner }, visibility: "PRIVATE", isArchived: false } } });
      return Response.json({ id: Number(identity.githubId), node_id: identity.nodeId, owner: { login: identity.owner }, name: identity.name, visibility: "private", default_branch: "main" });
    });
    await expect(current.caller(current.member.id).repositoryContext({ projectId: project.id })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await current.dao.findById!(project.id))?.repository?.githubId).toBe("202");
  });
  it("IT-037 resolves the stable node after rename and labels the same project", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    await current.authorize(current.member.id);
    const renamed = { ...repository, owner: "new-org", name: "renamed" };
    current.fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith("/graphql")) return Response.json({ data: { node: { databaseId: 202, id: "R_202", owner: { login: renamed.owner }, name: renamed.name, visibility: "PRIVATE", isArchived: false } } });
      return Response.json({ id: 202, node_id: "R_202", owner: { login: renamed.owner }, name: renamed.name, visibility: "private", default_branch: "main" });
    });
    const context = await current.caller(current.member.id).repositoryContext({ projectId: project.id });
    expect(context.repository).toMatchObject({ githubId: "202", owner: renamed.owner, name: renamed.name });
    expect((await current.dao.findById!(project.id))?.repository?.githubId).toBe("202");
  });
  it("IT-069 checks a saved private repository publicly and refuses a reused ID", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    current.fetcher.mockImplementation(async () => Response.json({ id: 202, node_id: "R_202", owner: { login: "acme" }, name: "private", visibility: "public", archived: false }));
    expect((await current.caller(current.member.id).connectionStates({ projectIds: [project.id] }))[0]?.kind).toBe("available");
    current.fetcher.mockImplementation(async () => Response.json({ id: 303, node_id: "R_303", owner: { login: "acme" }, name: "private", visibility: "public" }));
    expect((await current.caller(current.member.id).connectionStates({ projectIds: [project.id] }))[0]).toMatchObject({ kind: "access_denied_or_missing", reason: "identity_mismatch" });
  });
  it("US-006 maps expired authorization per project without failing its batch", async () => {
    current = await fixture();
    const first = await current.project(repository, "Alpha");
    const second = await current.project({ ...repository, githubId: "303", nodeId: "R_303", name: "another" }, "Beta");
    await current.permissions.assign(current.member.id, first.id, current.admin.id);
    await current.permissions.assign(current.member.id, second.id, current.admin.id);
    await current.authorize(current.member.id);
    await current.store.saveCredential({ userId: current.member.id, githubUserId: "88", accessToken: "expired", refreshToken: "expired_refresh", accessExpiresAt: new Date(Date.now() - 1000), refreshExpiresAt: new Date(Date.now() - 1000), scopes: ["repo"] });
    expect(await current.caller(current.member.id).connectionStates({ projectIds: [first.id, second.id] })).toEqual([{ projectId: first.id, kind: "authorization_needed" }, { projectId: second.id, kind: "authorization_needed" }]);
  });
});
