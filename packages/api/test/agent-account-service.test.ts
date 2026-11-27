import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { service } from "./agent-account-service-support";

afterEach(closeTaskFixture);

describe("AgentAccountService create and rename", () => {
  it("V-02a creates a pending Claude account, ensures its home, and returns its login command", async () => {
    const { setup, instance, ensured, logs } = await service();
    const created = await instance.create(setup.ownerId, { provider: "claude", label: "Pessoal" });
    expect(created).toMatchObject({ provider: "claude", label: "Pessoal", status: "pending_login", loginCommand: "CLAUDE_CONFIG_DIR='/state/agent-accounts/" + created.id + "' claude auth login" });
    expect(ensured).toEqual([created.id]);
    expect(logs).toEqual([`[accounts] created account=${created.id}`]);
    expect(await instance.list(setup.ownerId)).toEqual([created]);
  });

  it("V-02b accepts an unbounded count of accounts across both providers", async () => {
    const { setup, instance } = await service();
    for (const label of ["Pessoal", "Trabalho", "Claude C"]) await instance.create(setup.ownerId, { provider: "claude", label });
    for (const label of ["Codex A", "Codex B", "Codex C"]) await instance.create(setup.ownerId, { provider: "codex", label });
    expect(await instance.list(setup.ownerId)).toHaveLength(6);
  });

  it("V-02c trims names and enforces one through forty characters", async () => {
    const { setup, instance } = await service();
    await expect(instance.create(setup.ownerId, { provider: "claude", label: "   " })).rejects.toMatchObject({ reason: "label_invalid", message: "Informe um nome para a conta." });
    await expect(instance.create(setup.ownerId, { provider: "claude", label: "x".repeat(41) })).rejects.toMatchObject({ reason: "label_invalid", message: "O nome da conta pode ter até 40 caracteres." });
    await expect(instance.create(setup.ownerId, { provider: "claude", label: "x".repeat(40) })).resolves.toMatchObject({ label: "x".repeat(40) });
    await expect(instance.create(setup.ownerId, { provider: "codex", label: " Pessoal " })).resolves.toMatchObject({ label: "Pessoal" });
  });

  it("V-02d rejects case-insensitive duplicates on create and rename", async () => {
    const { setup, instance } = await service();
    const first = await instance.create(setup.ownerId, { provider: "claude", label: "Pessoal" });
    const second = await instance.create(setup.ownerId, { provider: "claude", label: "Trabalho" });
    await expect(instance.create(setup.ownerId, { provider: "claude", label: "pessoal" })).rejects.toMatchObject({ reason: "label_taken", message: "Você já tem uma conta do Claude Code com esse nome" });
    await expect(instance.rename(setup.ownerId, { id: second.id, label: "PESSOAL", version: second.version })).rejects.toMatchObject({ reason: "label_taken", message: "Você já tem uma conta do Claude Code com esse nome" });
    expect(await instance.list(setup.ownerId)).toHaveLength(2);
    expect(first.label).toBe("Pessoal");
  });

  it("V-02e renames with the current version and rejects a stale version", async () => {
    const { setup, instance, dao } = await service();
    const account = await instance.create(setup.ownerId, { provider: "codex", label: "Codex A" });
    const renamed = await instance.rename(setup.ownerId, { id: account.id, label: "Codex Principal", version: account.version });
    expect(renamed).toMatchObject({ label: "Codex Principal", version: 2 });
    expect((await instance.list(setup.ownerId))[0]?.label).toBe("Codex Principal");
    expect((await dao.findById(account.id))?.label).toBe("Codex Principal");
    await expect(instance.rename(setup.ownerId, { id: account.id, label: "Antigo", version: account.version })).rejects.toMatchObject({ reason: "stale" });
  });
});
