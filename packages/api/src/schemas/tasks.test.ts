import { describe, expect, it, vi } from "vitest";
import { TasksController } from "../controllers/tasksController";
import { createTasksRouter } from "../routers/tasks";
import { taskStartInputSchema } from "./tasks";

const projectId = "00000000-0000-4000-8000-000000000001";
const requestKey = "00000000-0000-4000-8000-000000000051";

describe("task start contract", () => {
  it("UT-001 accepts only project, request key, and intention fields", () => {
    const parsed = taskStartInputSchema.parse({ projectId, requestKey, message: "Corrigir total do carrinho ao remover item", authorUserId: "forged", repositoryId: "303" });
    expect(parsed).toEqual({ projectId, requestKey, message: "Corrigir total do carrinho ao remover item" });
  });

  it("UT-002 returns blank_message without repository or DAO work", async () => {
    const start = vi.fn();
    const requireRead = vi.fn();
    const tasks = createTasksRouter(new TasksController({ start } as never, { requireRead } as never));
    const caller = tasks.createCaller({ principal: { userId: "user-1", sessionId: "session-1" }, requestId: "test", responseHeaders: undefined });
    await expect(caller.start({ projectId, requestKey, message: "   " })).rejects.toMatchObject({ cause: { reason: "blank_message" } });
    expect(requireRead).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
});
