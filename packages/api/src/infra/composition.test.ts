import { describe, expect, it, vi } from "vitest";

describe("production task composition", () => {
  it("UT-045 creates the durable task controller from configured database and gateways", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
    vi.stubEnv("GITHUB_REPOSITORY_TOKEN_KEY", "0".repeat(64));
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_SECRET", "client-secret");
    vi.resetModules();
    const [{ createProductionTasksController }, { TasksController }, database] = await Promise.all([
      import("./composition"),
      import("../controllers/tasksController"),
      import("./database/client"),
    ]);
    try { expect(createProductionTasksController()).toBeInstanceOf(TasksController); }
    finally { await database.sql?.end({ timeout: 1 }); vi.unstubAllEnvs(); }
  });

  it("UT-036 refuses worker startup without a database instead of using an in-memory queue", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    const { createProductionTaskWorkerController } = await import("./composition");
    expect(() => createProductionTaskWorkerController()).toThrow("DATABASE_URL is required for database operations");
    vi.unstubAllEnvs();
  });
});
