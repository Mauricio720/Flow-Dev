import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { CodexCatalogPublisher } from "../src/application/services/terminal/codexCatalogPublisher";
import { CodexCatalogStep } from "../src/application/services/terminal/codexCatalogStep";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { terminalSessionHosts } from "../src/infra/database/schema";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { flowDevWorld, HOST_ID } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("Codex catalog publisher", () => {
  it("V-08a publishes the machine catalog and refreshes logged-in Codex accounts sequentially", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    await hosts.beat({ hostId: HOST_ID, workerId: "catalog-accounts", heartbeatAt: new Date("2026-11-23T14:32:00.000Z") });
    const accounts = new DrizzleAgentAccountDao(setup.database);
    const home = { pathOf: ({ id }: { id: string }) => `/accounts/${id}` } as never;
    const owner = setup.ownerId;
    const codexB = await accounts.insert({ ownerUserId: owner, hostId: HOST_ID, provider: "codex", label: "Codex B" });
    const codexC = await accounts.insert({ ownerUserId: owner, hostId: HOST_ID, provider: "codex", label: "Codex C" });
    const checkedAt = new Date("2026-11-23T14:32:00.000Z");
    await accounts.saveCheck({ id: codexB.id, status: "logged_out", identity: null, plan: null, checkedAt });
    await accounts.saveCheck({ id: codexC.id, status: "logged_in", identity: null, plan: null, checkedAt });
    const calls: string[] = [];
    const machine = { available: true, reason: null, version: "0.159.3", models: [{ id: "machine", label: "Machine", isDefault: true, efforts: ["high"], defaultEffort: "high" }], refreshedAt: checkedAt.toISOString() };
    const account = { ...machine, models: [{ id: "gpt-c-1", label: "Codex C model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] };
    const probe = { read: vi.fn(async (input?: { codexHome?: string }) => { calls.push(input?.codexHome ?? "machine"); return input?.codexHome ? account : machine; }) };
    const publisher = new CodexCatalogPublisher({ hosts, probe, accounts, home, hostId: HOST_ID, now: () => checkedAt });
    await publisher.refresh();
    expect(calls).toEqual(["machine", `/accounts/${codexC.id}`]);
    expect(await hosts.codexStatus(HOST_ID)).toMatchObject({ models: [{ id: "machine" }] });
    expect(await accounts.findById(codexC.id)).toMatchObject({ codexCatalog: { models: [{ id: "gpt-c-1" }] }, status: "logged_in" });
    expect(await accounts.findById(codexB.id)).toMatchObject({ codexCatalog: null, status: "logged_out" });
  });

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
