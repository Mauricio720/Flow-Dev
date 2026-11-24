import { afterEach, describe, expect, it } from "vitest";
import { createSessionWorker } from "../src/infra/sessionWorkerComposition";
import { CodexCatalogStep } from "../src/application/services/terminal/codexCatalogStep";
import { CODEX_CATALOG_REFRESH_MS } from "../src/application/services/terminal/codexCatalogPublisher";
import { HeartbeatSessionServiceStatus } from "../src/application/services/terminal/sessionServiceStatus";
import { SessionPurposeResolver, type PurposeDeps } from "../src/application/services/terminal/sessionPurpose";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { HOST_ID, OTHER_HOST_ID, flowDevWorld } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

function purposeDeps(catalog: HeartbeatSessionServiceStatus): PurposeDeps {
  return { specs: { specs: async () => [] }, loader: { load: async () => null }, plans: { find: async () => null, markForced: async () => undefined }, agents: new Set(["claude", "codex"]), catalog, log: { manifestInvalid: () => undefined, saved: () => undefined, conflict: () => undefined, itemStarted: () => undefined }, now: () => new Date("2026-11-23T14:32:00Z") };
}

describe("published Codex catalog reads", () => {
  it("starts with a heartbeat, refreshes immediately and schedules a ten-minute refresh", async () => {
    const { setup } = await flowDevWorld();
    const now = new Date("2026-11-23T14:32:00Z");
    const hosts = new DrizzleSessionHostDao(setup.database);
    await hosts.beat({ hostId: HOST_ID, workerId: "catalog-before-step", heartbeatAt: now });
    let scheduled: (() => Promise<void>) | undefined;
    let scheduledInterval = 0;
    let stopped = false;
    const publisher = { refresh: async () => { await hosts.publishCodexStatus({ hostId: HOST_ID, status: { available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [] } }); } };
    const step = new CodexCatalogStep(publisher, (tick, interval) => { scheduled = tick; scheduledInterval = interval; return () => { stopped = true; }; });
    await step.start();
    expect((await hosts.codexStatus(HOST_ID))).toMatchObject({ available: true, version: "0.159.3" });
    expect(scheduledInterval).toBe(CODEX_CATALOG_REFRESH_MS);
    await scheduled?.();
    expect(stopped).toBe(false);

    const probe = { read: async () => ({ available: true, reason: null, version: "0.159.3", refreshedAt: now.toISOString(), models: [] }) };
    const worker = createSessionWorker(setup.database, { hostId: HOST_ID, workerId: "catalog-worker", now: () => now, codexProbe: { read: async () => { expect(await hosts.lastBeat(HOST_ID)).not.toBeNull(); return probe.read(); } }, env: {} });
    const abort = new AbortController();
    abort.abort();
    await worker.run(abort.signal);
    expect(await hosts.codexStatus(HOST_ID)).toMatchObject({ available: true, version: "0.159.3" });
  });

  it("V-50a/V-50e reads only the local host snapshot and gives the service heartbeat precedence", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    const now = () => new Date("2026-11-23T14:32:00Z");
    const status = { available: true, reason: null, version: "0.159.3", refreshedAt: now().toISOString(), models: [{ id: "gpt-6.1", label: "GPT 6.1", isDefault: true, efforts: ["high"], defaultEffort: "high" }] };
    await hosts.beat({ hostId: HOST_ID, workerId: "local", heartbeatAt: now() });
    await hosts.publishCodexStatus({ hostId: HOST_ID, status });
    await hosts.beat({ hostId: OTHER_HOST_ID, workerId: "foreign", heartbeatAt: now() });
    await hosts.publishCodexStatus({ hostId: OTHER_HOST_ID, status: { ...status, models: [{ ...status.models[0]!, id: "foreign-model" }] } });
    const local = new HeartbeatSessionServiceStatus({ hosts, hostId: HOST_ID, now });
    const view = await new SessionPurposeResolver(purposeDeps(local)).preview("task", { kind: "route" });
    expect(view.agents[1]).toMatchObject({ available: true, modelOptions: [{ id: "gpt-6.1", label: "GPT 6.1", efforts: ["high"] }] });
    expect(await local.codexStatus()).toMatchObject({ models: [{ id: "gpt-6.1" }] });

    const offline = new HeartbeatSessionServiceStatus({ hosts, hostId: HOST_ID, now: () => new Date(now().getTime() + 15_001) });
    const staleView = await new SessionPurposeResolver(purposeDeps(offline)).preview("task", { kind: "route" });
    expect(staleView.agents[1]).toMatchObject({ available: false, reason: "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." });

    const foreign = new HeartbeatSessionServiceStatus({ hosts, hostId: "never-published", now });
    expect(await foreign.codexStatus()).toBeNull();
  });
});
