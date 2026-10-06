import { describe, expect, it } from "vitest";
import { ProjectAccessService } from "./projectAccessService";
import type { ProjectDao, ProjectRecord } from "../../database/dao/projectDao";

const project = (index: number): ProjectRecord => ({ id: "00000000-0000-4000-8000-" + index.toString().padStart(12, "0"), externalKey: "project-" + index.toString().padStart(3, "0"), name: "Project " + index, description: null, isDemo: false, createdAt: new Date() });

describe("project access service", () => {
  it("filters assigned projects before pagination", async () => {
    const projects = Array.from({ length: 121 }, (_, index) => project(index));
    const last = projects[120]!;
    const dao: ProjectDao = { list: async () => projects, findByExternalKey: async () => null, upsert: async () => ({ record: last, inserted: false }), findAuthorized: async (_user, id) => projects.find((item) => item.id === id) ?? null };
    const service = new ProjectAccessService(dao, {
      isAdmin: async () => false,
      hasAssignment: async (_user, id) => id === last.id,
      findUser: async () => null,
      listUsers: async () => ({ items: [], nextCursor: null }),
      listAssignments: async () => ({ items: [], nextCursor: null }),
      findProject: async () => null,
      assign: async () => undefined,
      remove: async () => false,
      replaceAdmins: async () => undefined,
    });
    const page = await service.listVisible({ userId: "user" }, {});
    expect(page.items.map((item) => item.id)).toEqual([last.id]);
    expect(page.nextCursor).toBeNull();
  });
});
