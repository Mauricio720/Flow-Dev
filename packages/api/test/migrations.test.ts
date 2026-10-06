import { afterEach, describe, expect, it } from "vitest";
import { applyMigration, testDatabase } from "./database";
import { stageProjectBackfill } from "../src/infra/database/dao/projectBackfill";
import { repository } from "./fixture";

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

describe("incremental legacy database migration", () => {
  it("preserves populated project, assignment, session and user IDs across verified backfill", async () => {
    const db = await testDatabase(true);
    close = db.close;
    const [user] = await db.client`INSERT INTO users(name,email) VALUES ('Legacy','legacy@test.invalid') RETURNING id`;
    const [project] = await db.client`INSERT INTO projects(external_key,name,description) VALUES ('legacy-alpha','Alpha','legacy description') RETURNING id`;
    await db.client`INSERT INTO project_assignments(user_id,project_id) VALUES (${user.id},${project.id})`;
    await db.client`INSERT INTO sessions(token,user_id,expires_at) VALUES ('legacy-session',${user.id},now()+interval '1 day')`;
    await applyMigration(db.client, "0002_repository_expansion");
    await expect(applyMigration(db.client, "0003_repository_constraints")).rejects.toThrow(/verified repository mapping/);
    const stillLegacy = await db.client`SELECT id, name FROM projects WHERE id=${project.id}`;
    expect(stillLegacy[0]?.id).toBe(project.id);
    expect((await db.client`SELECT count(*)::int AS count FROM project_assignments WHERE user_id=${user.id} AND project_id=${project.id}`)[0]?.count).toBe(1);
    expect((await db.client`SELECT token FROM sessions WHERE user_id=${user.id}`)[0]?.token).toBe("legacy-session");
    await stageProjectBackfill(db.database, [{ externalKey: "flow-dev-demo", name: "Flow Dev", repository: { ...repository, githubId: "101", nodeId: "R_101", name: "demo" } }, { externalKey: "legacy-alpha", name: "Alpha", repository }]);
    await applyMigration(db.client, "0003_repository_constraints");
    expect((await db.client`SELECT github_repository_id FROM projects WHERE id=${project.id}`)[0]?.github_repository_id).toBe("202");
  });
  it("requires complete mappings atomically and retains IDs for every project", async () => {
    const db = await testDatabase(true);
    close = db.close;
    const [first] = await db.client`INSERT INTO projects(external_key,name) VALUES ('one','One') RETURNING id`;
    const [second] = await db.client`INSERT INTO projects(external_key,name) VALUES ('two','Two') RETURNING id`;
    await applyMigration(db.client, "0002_repository_expansion");
    await stageProjectBackfill(db.database, [{ externalKey: "flow-dev-demo", name: "Flow Dev", repository: { ...repository, githubId: "101", nodeId: "R_101", name: "demo" } }, { externalKey: "one", name: "One", repository }]);
    await expect(applyMigration(db.client, "0003_repository_constraints")).rejects.toThrow();
    expect((await db.client`SELECT github_repository_id FROM projects WHERE id=${first.id}`)[0]?.github_repository_id).toBeNull();
    await stageProjectBackfill(db.database, [{ externalKey: "flow-dev-demo", name: "Flow Dev", repository: { ...repository, githubId: "101", nodeId: "R_101", name: "demo" } }, { externalKey: "one", name: "One", repository }, { externalKey: "two", name: "Two", repository: { ...repository, githubId: "303", nodeId: "R_303", name: "second" } }]);
    await applyMigration(db.client, "0003_repository_constraints");
    expect((await db.client`SELECT id, github_repository_id FROM projects WHERE external_key IN ('one', 'two') ORDER BY external_key`)).toEqual([{ id: first.id, github_repository_id: "202" }, { id: second.id, github_repository_id: "303" }]);
  });
});
