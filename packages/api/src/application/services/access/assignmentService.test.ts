import { describe, expect, it } from "vitest";
import { AssignmentService, AdminRequiredError } from "./assignmentService";
import { InMemoryAccessDao } from "../../../infra/database/dao/accessInMemoryDao";
import { InMemoryProjectDao } from "../../../infra/database/dao/projects/inMemoryProjectDao";

describe("assignment service", () => {
  it("requires the current admin designation", async () => { const dao = new InMemoryAccessDao(); dao.seedUser({ id: "u1", githubId: "1001", githubLogin: "alice", lastProjectId: null }); await expect(new AssignmentService(dao).listUsers({ userId: "u1" }, {})).rejects.toBeInstanceOf(AdminRequiredError); });
  it("keeps assignment operations idempotent", async () => { const dao = new InMemoryAccessDao(); const service = new AssignmentService(dao); dao.seedUser({ id: "admin", githubId: "1", githubLogin: "admin", lastProjectId: null }); dao.seedUser({ id: "u1", githubId: "1001", githubLogin: "alice", lastProjectId: null }); await dao.replaceAdmins([{ githubUserId: "1", resolvedLogin: "admin" }]); const project = (await new InMemoryProjectDao().list())[0]; if (!project) throw new Error("Missing demo project"); expect(await service.assign({ userId: "admin" }, { userId: "u1", projectId: project.id })).toEqual({ assigned: true }); expect(await service.assign({ userId: "admin" }, { userId: "u1", projectId: project.id })).toEqual({ assigned: true }); expect((await service.listAssignments({ userId: "admin" }, "u1")).items).toHaveLength(1); });
});
