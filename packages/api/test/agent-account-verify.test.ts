import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { service } from "./agent-account-service-support";

afterEach(closeTaskFixture);

describe("AgentAccountService verify", () => {
  it("V-02i and V-02j verify each account independently and keep identity private to Claude", async () => {
    const { setup, instance } = await service(async () => ({ status: "logged_in", identity: "ana@exemplo.com", plan: "max", detail: null }));
    const claudeA = await instance.create(setup.ownerId, { provider: "claude", label: "Pessoal" });
    const claudeB = await instance.create(setup.ownerId, { provider: "claude", label: "Trabalho" });
    const codex = await instance.create(setup.ownerId, { provider: "codex", label: "Codex A" });
    const verifiedA = await instance.verify(setup.ownerId, { id: claudeA.id });
    const verifiedB = await instance.verify(setup.ownerId, { id: claudeB.id });
    const verifiedCodex = await instance.verify(setup.ownerId, { id: codex.id });
    expect(verifiedA).toMatchObject({ status: "logged_in", identity: "ana@exemplo.com", plan: "max", checkedAt: "2026-11-25T12:00:00.000Z" });
    expect(verifiedB).toMatchObject({ identity: "ana@exemplo.com", checkedAt: "2026-11-25T12:00:00.000Z" });
    expect(verifiedCodex).toMatchObject({ status: "logged_in", identity: null, plan: null });
  });

  it("V-15a lists twenty persisted accounts before blocked inspections finish", async () => {
    let release!: () => void;
    let finishAll!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const allFinished = new Promise<void>((resolve) => { finishAll = resolve; });
    let finished = 0;
    const { setup, instance } = await service(async () => {
      await gate;
      finished += 1;
      if (finished === 20) finishAll();
      return { status: "logged_out", identity: null, plan: null, detail: null };
    });
    for (let index = 1; index <= 20; index += 1) await instance.create(setup.ownerId, { provider: "claude", label: `Conta ${index}` });
    const listed = await instance.list(setup.ownerId);
    expect(listed).toHaveLength(20);
    expect(listed.every((account) => account.status === "pending_login")).toBe(true);
    release();
    await allFinished;
  });
});
