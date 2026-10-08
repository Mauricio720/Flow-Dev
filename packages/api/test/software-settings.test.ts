import { afterEach, describe, expect, it } from "vitest";
import { failureOf, key, softwareFixture, type SoftwareFixture } from "./software-support";

let current: SoftwareFixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });
const values = { enabled: true, docsProxyUrl: "https://docs.example.com/spec", maxActiveActions: 2 };

describe("software settings", () => {
  it("UT-001, UT-002 and IT-004 enforce administrators on every call, including after role loss", async () => {
    current = await softwareFixture();
    expect(await current.adminCaller.get()).toMatchObject({ revision: 0, settings: { enabled: false, docsProxyUrl: null, maxActiveActions: 1 } });
    expect(await failureOf(current.memberCaller.get())).toEqual({ code: "FORBIDDEN", reason: "admin_required" });
    expect(await failureOf(current.memberCaller.connections({}))).toMatchObject({ code: "FORBIDDEN" });
    await current.client`DELETE FROM admin_designations`;
    expect(await failureOf(current.adminCaller.get())).toMatchObject({ code: "FORBIDDEN" });
    expect(await failureOf(current.adminCaller.saveSettings({ values, expectedRevision: 0, idempotencyKey: key() }))).toMatchObject({ code: "FORBIDDEN" });
    expect(await failureOf(current.anonymous.get())).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("UT-002 rejects a non-admin before any connection row is loaded", async () => {
    current = await softwareFixture();
    const loaded: string[] = [];
    const spy = { ...current.dao, isAdmin: current.dao.isAdmin.bind(current.dao), settings: current.dao.settings, audit: current.dao.audit, operations: current.dao.operations, transaction: current.dao.transaction.bind(current.dao), connections: { ...current.dao.connections, list: async () => { loaded.push("list"); throw new Error("must not load"); } } };
    const { SoftwareService } = await import("../src/application/services/software/softwareService");
    const service = new SoftwareService({ dao: spy as never, broker: current.broker, gateway: current.gateway, host: current.host });
    await expect(service.listConnections({ userId: current.member.id }, { limit: 20 })).rejects.toMatchObject({ reason: "admin_required" });
    expect(loaded).toEqual([]);
  });

  it("IT-015, IT-112, UT-003, UT-004 and IT-019/IT-020 save with CAS and idempotency", async () => {
    current = await softwareFixture();
    const first = key();
    const saved = await current.adminCaller.saveSettings({ values, expectedRevision: 0, idempotencyKey: first });
    expect(saved).toEqual({ revision: 1, settings: values });
    expect(await current.adminCaller.saveSettings({ values, expectedRevision: 0, idempotencyKey: first })).toEqual(saved);
    expect(await failureOf(current.adminCaller.saveSettings({ values: { ...values, maxActiveActions: 3 }, expectedRevision: 0, idempotencyKey: first }))).toMatchObject({ code: "CONFLICT", reason: "idempotency_key_reused" });
    expect(await failureOf(current.adminCaller.saveSettings({ values: { ...values, maxActiveActions: 3 }, expectedRevision: 0, idempotencyKey: key() }))).toEqual({ code: "CONFLICT", reason: "plan_version_changed" });
    const [{ count }] = await current.client`SELECT count(*)::int AS count FROM software_audit WHERE event='settings.saved'`;
    expect(count).toBe(1);
    expect((await current.adminCaller.get()).revision).toBe(1);
  });

  it("IT-016, IT-017, IT-113 and IT-072 reject invalid input without activation or audit", async () => {
    current = await softwareFixture();
    const attempt = (next: Record<string, unknown>) => failureOf(current!.adminCaller.saveSettings({ values: { ...values, ...next }, expectedRevision: 0, idempotencyKey: key() }));
    expect(await attempt({ docsProxyUrl: "http://docs.example.com" })).toEqual({ code: "BAD_REQUEST", reason: "docs_proxy_https_required" });
    expect(await attempt({ maxActiveActions: 5 })).toEqual({ code: "BAD_REQUEST", reason: "max_active_actions_out_of_range" });
    expect(await attempt({ docsProxyUrl: null })).toEqual({ code: "BAD_REQUEST", reason: "docs_proxy_required" });
    expect(await attempt({ docsProxyUrl: `https://${"a".repeat(3000)}.example` })).toMatchObject({ code: "BAD_REQUEST" });
    expect(await attempt({ docsProxyUrl: "javascript:alert(1)" })).toMatchObject({ code: "BAD_REQUEST" });
    const [{ count }] = await current.client`SELECT count(*)::int AS count FROM software_audit`;
    expect(count).toBe(0);
    expect((await current.adminCaller.get()).settings.enabled).toBe(false);
  });

  it("IT-019 and IT-075 serialize two concurrent administrators and keep audit order", async () => {
    current = await softwareFixture();
    const results = await Promise.allSettled([
      current.adminCaller.saveSettings({ values, expectedRevision: 0, idempotencyKey: key() }),
      current.adminCaller.saveSettings({ values: { ...values, maxActiveActions: 4 }, expectedRevision: 0, idempotencyKey: key() }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const history = await current.adminCaller.history({});
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({ event: "settings.saved", actorName: "Admin" });
  });

  it("IT-005, IT-006 and IT-007 give concurrent and repeated reads the same saved state", async () => {
    current = await softwareFixture();
    await current.adminCaller.saveSettings({ values, expectedRevision: 0, idempotencyKey: key() });
    const reads = await Promise.all([current.adminCaller.get(), current.adminCaller.get(), current.adminCaller.get()]);
    expect(new Set(reads.map((read) => JSON.stringify([read.revision, read.settings]))).size).toBe(1);
    await current.project();
    expect((await current.adminCaller.get()).revision).toBe(1);
    const [{ count }] = await current.client`SELECT count(*)::int AS count FROM software_audit`;
    expect(count).toBe(1);
  });

  it("IT-073, IT-074, IT-076 and IT-077 page redacted history without duplicates", async () => {
    current = await softwareFixture();
    expect((await current.adminCaller.history({})).items).toEqual([]);
    expect(await failureOf(current.memberCaller.history({}))).toMatchObject({ code: "FORBIDDEN" });
    for (let revision = 0; revision < 5; revision++) {
      await current.adminCaller.saveSettings({ values: { ...values, maxActiveActions: (revision % 4) + 1 }, expectedRevision: revision, idempotencyKey: key() });
    }
    const first = await current.adminCaller.history({ limit: 2 });
    const second = await current.adminCaller.history({ limit: 2, cursor: first.nextCursor! });
    const third = await current.adminCaller.history({ limit: 2, cursor: second.nextCursor! });
    const ids = [...first.items, ...second.items, ...third.items].map((item) => item.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(third.nextCursor).toBeNull();
    expect(JSON.stringify(first)).not.toMatch(/token|secret|password/i);
  });
});
