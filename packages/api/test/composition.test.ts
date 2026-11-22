import { describe, expect, it, vi } from "vitest";

describe("production task composition", () => {
  it("UT-045 creates the durable task controller from configured database and gateways", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
    vi.stubEnv("GITHUB_REPOSITORY_TOKEN_KEY", "0".repeat(64));
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_SECRET", "client-secret");
    vi.resetModules();
    const [{ createProductionTasksController }, { TasksController }, database] = await Promise.all([
      import("../src/infra/composition"),
      import("../src/controllers/tasksController"),
      import("../src/infra/database/client"),
    ]);
    try { expect(createProductionTasksController()).toBeInstanceOf(TasksController); }
    finally { await database.sql?.end({ timeout: 1 }); vi.unstubAllEnvs(); }
  });

  it("UT-036 refuses worker startup without a database instead of using an in-memory queue", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    const { createProductionTaskWorkerController } = await import("../src/infra/composition");
    expect(() => createProductionTaskWorkerController()).toThrow("DATABASE_URL is required for database operations");
    vi.unstubAllEnvs();
  });

  it("V-10a wires the local gateways into the worker without any Dev Control variable", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
    vi.stubEnv("GITHUB_REPOSITORY_TOKEN_KEY", "0".repeat(64));
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_REPOSITORY_CLIENT_SECRET", "client-secret");
    for (const name of Object.keys(process.env).filter((key) => /^(ISSUE_AUTHOR_|PLANNING_|FLOW_DEV_INTERNAL_)/.test(key))) vi.stubEnv(name, undefined);
    vi.resetModules();
    const [{ createProductionTaskWorkerController }, { LocalIssueAuthorGateway }, { LocalPlanningGateway }, database] = await Promise.all([
      import("../src/infra/composition"),
      import("../src/infra/issue-author/localIssueAuthorGateway"),
      import("../src/infra/planning/localPlanningGateway"),
      import("../src/infra/database/client"),
    ]);
    try {
      const worker = createProductionTaskWorkerController() as unknown as { author: unknown; planning: { gateway: unknown } };
      expect(worker.author).toBeInstanceOf(LocalIssueAuthorGateway);
      expect(worker.planning.gateway).toBeInstanceOf(LocalPlanningGateway);
    } finally { await database.sql?.end({ timeout: 1 }); vi.unstubAllEnvs(); }
  });
});
