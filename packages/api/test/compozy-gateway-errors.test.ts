import { afterEach, describe, expect, it } from "vitest";
import { fakeDaemon } from "./compozy-daemon-fake";
import { CompozyHttpGateway } from "../src/infra/compozy/compozyHttpGateway";
import { COMPOZY_CALL_TIMEOUT_MS } from "../src/infra/compozy/compozyConnection";

type Daemon = Awaited<ReturnType<typeof fakeDaemon>>;
let daemon: Daemon | undefined;
afterEach(async () => { await daemon?.close(); daemon = undefined; });

const failure = (reason: string, detail: Record<string, unknown> = {}) => expect.objectContaining({ reason, detail: expect.objectContaining(detail) });
const run = { taskId: "task_01", idempotencyKey: "0b6f2c1a-8d3e-4f5a-9b7c-1e2d3f4a5b6c" };

describe("IT-019 CompozyHttpGateway error translation", () => {
  it("maps a missing task on read to compozy_task_missing", async () => {
    daemon = await fakeDaemon();
    daemon.on("GET /api/tasks/task_gone", () => ({ status: 404, body: { error: "task not found", code: "task_not_found" } }));
    await expect(daemon.gateway().readTask("task_gone")).rejects.toEqual(failure("compozy_task_missing", { status: 404, daemonCode: "task_not_found" }));
  });

  it.each([400, 409, 422])("maps HTTP %i to compozy_rejected keeping the daemon code", async (status) => {
    daemon = await fakeDaemon();
    daemon.on("POST /api/tasks/task_01/runs", () => ({ status, body: { error: "rejected", code: `daemon_code_${status}` } }));
    await expect(daemon.gateway().enqueueRun(run)).rejects.toEqual(failure("compozy_rejected", { operation: "enqueueTaskRun", status, daemonCode: `daemon_code_${status}` }));
  });

  it("maps a 5xx answer to compozy_unavailable", async () => {
    daemon = await fakeDaemon();
    daemon.on("POST /api/workspaces/resolve", () => ({ status: 503, body: { error: "starting", code: "daemon_starting" } }));
    await expect(daemon.gateway().resolveWorkspace("/tmp/app")).rejects.toEqual(failure("compozy_unavailable", { status: 503 }));
  });

  it("maps a refused connection to compozy_unavailable and reports health as unreachable", async () => {
    daemon = await fakeDaemon();
    const { baseUrl } = daemon;
    await daemon.close();
    daemon = undefined;
    const gateway = new CompozyHttpGateway({ baseUrl: async () => baseUrl });
    await expect(gateway.resolveWorkspace("/tmp/app")).rejects.toEqual(failure("compozy_unavailable"));
    await expect(gateway.health()).resolves.toEqual({ reachable: false, version: null });
  });

  it("maps a call that exceeds the timeout to compozy_unavailable", async () => {
    daemon = await fakeDaemon();
    daemon.on("POST /api/tasks/task_01/cancel", () => "hang");
    await expect(daemon.gateway().cancelTask("task_01")).rejects.toEqual(failure("compozy_unavailable", { operation: "cancelTask" }));
    expect(COMPOZY_CALL_TIMEOUT_MS).toBe(10_000);
  });

  it("reports the daemon version as healthy", async () => {
    daemon = await fakeDaemon();
    await expect(daemon.gateway().health()).resolves.toEqual({ reachable: true, version: "0.7.3" });
  });
});
