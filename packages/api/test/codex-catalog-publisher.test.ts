import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { CodexCatalogPublisher } from "../src/application/services/terminal/codexCatalogPublisher";
import { CodexCatalogStep } from "../src/application/services/terminal/codexCatalogStep";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { terminalSessionHosts } from "../src/infra/database/schema";
import { flowDevWorld, HOST_ID } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("Codex catalog publisher", () => {
  it("publishes initially and exactly at ten minutes, preserving the beat after a probe failure", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    await hosts.beat({ hostId: HOST_ID, workerId: "worker-1", heartbeatAt: new Date() });
    const probe = { read: vi.fn().mockResolvedValue({ available: true, reason: null, version: "0.159.3", models: [], refreshedAt: new Date().toISOString() }).mockRejectedValueOnce(new Error("offline")) };
    let elapsed = 0;
    let tick: (() => Promise<void>) | undefined;
    let interval = 0;
    const schedule = (callback: () => Promise<void>, period: number) => { tick = callback; interval = period; return () => undefined; };
    const step = new CodexCatalogStep(new CodexCatalogPublisher({ hosts, probe, hostId: HOST_ID, now: () => new Date("2026-11-23T14:32:00.000Z") }), schedule);
    const stop = await step.start();
    expect(await hosts.codexStatus(HOST_ID)).toMatchObject({ available: false, reason: "Não foi possível consultar o catálogo do Codex." });
    expect(interval).toBe(600_000);
    elapsed = 599_999;
    expect(probe.read).toHaveBeenCalledTimes(1);
    elapsed += 1;
    expect(elapsed).toBe(600_000);
    await tick?.();
    expect(probe.read).toHaveBeenCalledTimes(2);
    await hosts.beat({ hostId: HOST_ID, workerId: "worker-2", heartbeatAt: new Date() });
    const [row] = await setup.database.select().from(terminalSessionHosts).where(eq(terminalSessionHosts.hostId, HOST_ID));
    expect(row?.codexStatus).toMatchObject({ available: true, version: "0.159.3" });
    expect(row?.workerId).toBe("worker-2");
    stop();
  });
});
