import { describe, expect, it, vi } from "vitest";
import type { ProjectsController } from "../controllers/projectsController";
import { createCallerFactory } from "../trpc";
import { createProjectsRouter } from "./projects";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 280;
const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const context = { principal: { userId: "admin" }, requestId: "test", responseHeaders: undefined };

function setup() {
  const controller = { create: vi.fn(async (_actor: unknown, input: { name: string }) => ({ id: PROJECT_ID, name: input.name })), candidates: vi.fn(async () => ({ items: [], nextCursor: null })) };
  const caller = createCallerFactory(createProjectsRouter(controller as unknown as ProjectsController))(context);
  return { controller, caller };
}

function fieldErrors(error: unknown) {
  const cause = (error as { cause?: { issues?: { path: PropertyKey[] }[] } }).cause;
  return cause?.issues?.map((issue) => issue.path.join(".")) ?? [];
}

describe("project creation inputs", () => {
  it("UT-008 rejects a blank or 61-character name without reaching the controller and accepts 2 and 60 after trim", async () => {
    const { controller, caller } = setup();
    for (const name of [" ", "n".repeat(NAME_MAX + 1)]) {
      const error = await caller.create({ name, nodeId: "R_202" }).catch((reason: unknown) => reason);
      expect(fieldErrors(error)).toEqual(["name"]);
    }
    expect(controller.create).not.toHaveBeenCalled();
    await caller.create({ name: " ab ", nodeId: "R_202" });
    await caller.create({ name: ` ${"n".repeat(NAME_MAX)} `, nodeId: "R_202" });
    expect(controller.create.mock.calls.map(([, input]) => input.name)).toEqual(["ab", "n".repeat(NAME_MAX)]);
  });

  it("UT-009 accepts an absent, null or 280-character description and rejects 281 on the field", async () => {
    const { controller, caller } = setup();
    await caller.create({ name: "Alpha", nodeId: "R_202" });
    await caller.create({ name: "Alpha", description: null, nodeId: "R_202" });
    await caller.create({ name: "Alpha", description: "d".repeat(DESCRIPTION_MAX), nodeId: "R_202" });
    expect(controller.create).toHaveBeenCalledTimes(3);
    const error = await caller.create({ name: "Alpha", description: "d".repeat(DESCRIPTION_MAX + 1), nodeId: "R_202" }).catch((reason: unknown) => reason);
    expect(fieldErrors(error)).toEqual(["description"]);
    expect(controller.create).toHaveBeenCalledTimes(3);
  });

  it("accepts the GitHub continuation cursor for candidates and rejects any other cursor", async () => {
    const { controller, caller } = setup();
    const secondPage = Buffer.from("2").toString("base64url");
    await caller.repositoryCandidates({ search: "acme", cursor: secondPage });
    expect(controller.candidates).toHaveBeenCalledWith(context.principal, { search: "acme", cursor: secondPage });
    await expect(caller.repositoryCandidates({ cursor: "https://evil.example/repos" })).rejects.toThrow();
    await expect(caller.repositoryCandidates({ cursor: Buffer.from("0").toString("base64url") })).rejects.toThrow();
  });
});
