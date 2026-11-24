import { afterEach, describe, expect, it, vi } from "vitest";
import { HeartbeatSessionServiceStatus } from "../src/application/services/terminal/sessionServiceStatus";
import { TerminalOpenGuard } from "../src/application/services/terminal/terminalOpenGuard";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { flowDevWorld, HOST_ID } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import { taskSetWorld } from "./task-set-support";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";

afterEach(closeTaskFixture);

function guard(service: HeartbeatSessionServiceStatus, codexProbe: { read: () => Promise<unknown> }, tools = { has: vi.fn(async () => false) }) {
  return { instance: new TerminalOpenGuard({ env: {}, checkouts: {} as never, verifier: {} as never, tools, context: {} as never, service, log: {} as never, codexProbe: codexProbe as never }), tools };
}

describe("Codex open availability", () => {
  it("V-50g checks service first, then current login/catalog, without requiring Claude", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    const now = new Date("2026-11-23T14:32:00Z");
    await hosts.beat({ hostId: HOST_ID, workerId: "worker", heartbeatAt: new Date(now.getTime() - 20_000) });
    await hosts.publishCodexStatus({ hostId: HOST_ID, status: { available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [{ id: "m1", label: "Model 1", isDefault: true, efforts: ["high"], defaultEffort: "high" }] } });
    const service = new HeartbeatSessionServiceStatus({ hosts, hostId: HOST_ID, now: () => now });
    const probe = { read: vi.fn().mockResolvedValue({ available: false, reason: "Faça login no Codex: rode `codex login`.", version: "0.159.3", models: [], refreshedAt: now.toISOString() }) };
    const unavailable = guard(service, probe);
    await expect(unavailable.instance.assertServiceRunning()).rejects.toMatchObject({ reason: "session_service_offline" });
    expect(probe.read).not.toHaveBeenCalled();

    await hosts.beat({ hostId: HOST_ID, workerId: "worker", heartbeatAt: now });
    const live = guard(service, probe);
    await expect(live.instance.assertTools({ agent: "codex", model: "m1", effort: "high" })).rejects.toMatchObject({ reason: "agent_unavailable", fieldErrors: { message: "Faça login no Codex: rode `codex login`." } });
    expect(live.tools.has).not.toHaveBeenCalled();
  });

  it("V-50h reports a removed model by id from the fresh catalog", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    const now = new Date("2026-11-23T14:32:00Z");
    await hosts.beat({ hostId: HOST_ID, workerId: "worker", heartbeatAt: now });
    await hosts.publishCodexStatus({ hostId: HOST_ID, status: { available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [] } });
    const service = new HeartbeatSessionServiceStatus({ hosts, hostId: HOST_ID, now: () => now });
    const current = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [] }) };
    const { instance } = guard(service, current);
    await expect(instance.assertTools({ agent: "codex", model: "removed-model", effort: "high" })).rejects.toMatchObject({ reason: "model_unavailable", fieldErrors: { message: "O modelo removed-model não está mais disponível no Codex. Troque o modelo da sessão." } });
  });

  it("V-50h keeps an existing plan item editable after its model disappears", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const choice = { agent: "codex" as const, model: "removed-model", effort: "high" };
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"], choice }] });
    const hosts = new DrizzleSessionHostDao(world.setup.database);
    const hostId = machineIdentity();
    const now = new Date("2026-11-23T14:32:00Z");
    await hosts.beat({ hostId, workerId: "worker", heartbeatAt: now });
    await hosts.publishCodexStatus({ hostId, status: { available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [] } });
    const saved = await world.harness.caller.plan.save({ ...world.scope, version: 1, items: [{ id: items[0]!.id, taskIds: ["task_01"], choice }] });
    expect(saved).toEqual({ version: 2 });
    expect((await world.harness.caller.plan.get(world.scope)).items[0]).toMatchObject({ id: items[0]!.id, choice });
  });
});
