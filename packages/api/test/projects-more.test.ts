import { afterEach, describe, expect, it, test } from "vitest";
import { fixture, repository, type Fixture } from "./fixture";

let current: Fixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("repository identity and project lifecycle contracts", () => {
  it("returns independent project states when one GitHub identity is no longer visible", async () => {
    current = await fixture();
    const first = await current.project(repository, "Alpha");
    const second = await current.project({ ...repository, githubId: "303", nodeId: "R_303", name: "other" }, "Beta");
    await current.permissions.assign(current.member.id, first.id, current.admin.id);
    await current.permissions.assign(current.member.id, second.id, current.admin.id);
    await current.authorize(current.member.id);
    current.fetcher.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/graphql") && JSON.parse(String(init?.body)).variables.id === "R_303") return Response.json({ data: { node: null } });
      return (await import("./fixture")).githubResponse(String(url));
    });
    expect(await current.caller(current.member.id).connectionStates({ projectIds: [first.id, second.id] })).toEqual([{ projectId: first.id, kind: "available", checkedAt: expect.any(String) }, { projectId: second.id, kind: "access_denied_or_missing" }]);
  });
  it("IT-045 reports only the current archive state and keeps reads available", async () => {
    current = await fixture();
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    await current.authorize(current.member.id);
    current.fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith("/graphql")) return Response.json({ data: { node: { databaseId: 202, id: "R_202", name: "private", owner: { login: "acme" }, visibility: "PRIVATE", isArchived: true } } });
      return Response.json({ id: 202, node_id: "R_202", name: "private", owner: { login: "acme" }, visibility: "private", archived: true });
    });
    expect((await current.caller(current.member.id).connectionStates({ projectIds: [project.id] }))[0]?.kind).toBe("archived");
    expect((await current.caller(current.member.id).repositoryContext({ projectId: project.id })).repository.archived).toBe(true);
    await expect(current.caller(current.member.id).create({ name: "No", nodeId: "R_202" })).rejects.toBeDefined();
  });
});
test("IT-050/051 previews and lists verified candidates with linked project IDs", async () => {
  current = await fixture();
  const linked = await current.project();
  await current.authorize(current.admin.id);
  const candidates = await current.caller(current.admin.id).repositoryCandidates({});
  expect(candidates).toMatchObject({ items: [{ repository: { githubId: "202" }, linkedProjectId: linked.id }], nextCursor: null });
  expect(await current.caller(current.admin.id).repositoryPreview({ owner: "acme", name: "private" })).toMatchObject({ repository: { githubId: "202" }, linkedProjectId: linked.id });
});
test("IT-052/053 creates and edits verified projects in PostgreSQL", async () => {
  current = await fixture();
  await current.authorize(current.admin.id);
  const created = await current.caller(current.admin.id).create({ name: "Alpha", nodeId: "R_202" });
  const [row] = await current.client`SELECT external_key, is_demo, github_repository_id FROM projects WHERE id=${created.id}`;
  expect(row).toEqual({ external_key: `project-${created.id}`, is_demo: false, github_repository_id: "202" });
  expect(await current.caller(current.admin.id).updateDetails({ projectId: created.id, name: "Beta", description: "Updated", expectedVersion: 1 })).toMatchObject({ name: "Beta", detailsVersion: 2, repository: { githubId: "202" } });
});
test("IT-060 blocks unprivileged project mutations before GitHub calls", async () => {
  current = await fixture();
  await current.authorize(current.member.id);
  await expect(current.caller(current.member.id).create({ name: "No", nodeId: "R_202" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(current.fetcher).not.toHaveBeenCalled();
});
