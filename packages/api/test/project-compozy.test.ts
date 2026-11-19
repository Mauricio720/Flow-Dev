import { rename } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OTHER_REMOTE, PROJECT_REMOTE, projectCompozyFixture, type ProjectCompozyFixture } from "./project-compozy-support";

let current: ProjectCompozyFixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("projectCompozy binding with PostgreSQL and real git clones", () => {
  it("IT-001 stores ready and invalid bindings with the right failure code", async () => {
    current = await projectCompozyFixture();
    const admin = current.caller(current.admin.id);
    const valid = await current.repository("Área de trabalho/valid");
    const ready = await admin.save({ projectId: current.project.id, checkoutPath: `${valid}/` });
    expect(ready).toMatchObject({ state: "ready", checkoutPath: valid, defaultBranch: "main", compozyWorkspaceId: "ws_1", failureCode: null, revision: 1 });
    expect(current.gateway.resolvedPaths).toEqual([valid]);
    const foreign = await current.repository("foreign", { remote: OTHER_REMOTE });
    const mismatch = await admin.save({ projectId: current.project.id, checkoutPath: foreign, expectedRevision: 1 });
    expect(mismatch).toMatchObject({ state: "invalid", failureCode: "checkout_remote_mismatch", compozyWorkspaceId: null, revision: 2 });
    const headless = await current.repository("headless", { remote: PROJECT_REMOTE, originHead: false });
    const unknown = await admin.save({ projectId: current.project.id, checkoutPath: headless, expectedRevision: 2 });
    expect(unknown).toMatchObject({ state: "invalid", failureCode: "default_branch_unknown", revision: 3 });
    expect(await current.rows()).toEqual([expect.objectContaining({ state: "invalid", failure_code: "default_branch_unknown", checkout_path: headless, revision: 3, updated_by: current.admin.id })]);
    expect(current.gateway.resolvedPaths).toHaveLength(1);
  });

  it("IT-002 rechecks a moved checkout as checkout_not_found and increments the revision", async () => {
    current = await projectCompozyFixture();
    const admin = current.caller(current.admin.id);
    const valid = await current.repository("app");
    await admin.save({ projectId: current.project.id, checkoutPath: valid });
    await rename(valid, join(current.directory, "moved"));
    const checked = await admin.check({ projectId: current.project.id, expectedRevision: 1 });
    expect(checked).toMatchObject({ state: "invalid", failureCode: "checkout_not_found", checkoutPath: valid, revision: 2 });
    expect((await current.rows())[0]).toMatchObject({ state: "invalid", failure_code: "checkout_not_found", revision: 2 });
  });

  it("US-002 shows the binding read only to members and reports daemon health", async () => {
    current = await projectCompozyFixture();
    await current.caller(current.admin.id).save({ projectId: current.project.id, checkoutPath: await current.repository("app") });
    current.gateway.unavailable = true;
    const view = await current.caller(current.member.id).get({ projectId: current.project.id });
    expect(view).toMatchObject({ binding: { state: "ready", revision: 1 }, compozy: { reachable: false, version: null }, canEdit: false });
    expect(typeof view.binding?.checkedAt).toBe("string");
    current.gateway.unavailable = false;
    expect(await current.caller(current.admin.id).get({ projectId: current.project.id })).toMatchObject({ compozy: { reachable: true, version: "0.7.3" }, canEdit: true });
  });
});
