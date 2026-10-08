import { afterEach, describe, expect, it } from "vitest";
import { DrizzleLocalLinkRequestDao } from "../src/infra/database/dao/local-execution/drizzleLocalLinkRequestDao";
import { localMachines } from "../src/infra/database/schema";
import { specTask } from "./spec-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const NOW = new Date("2026-10-07T12:00:00.000Z");
const LATER = new Date(NOW.getTime() + 5 * 60_000);

async function fixture() {
  const setup = await specTask();
  const [machine] = await setup.database.insert(localMachines).values({ ownerUserId: setup.ownerId, label: "Notebook", credentialHash: "hash", credentialExpiresAt: LATER }).returning();
  const scope = { ownerUserId: setup.ownerId, projectId: setup.project.id };
  return { dao: new DrizzleLocalLinkRequestDao(setup.database), scope, machineId: machine!.id };
}

describe("local link requests persistence", () => {
  it("lets one connector claim the newest waiting request and settle it once", async () => {
    const { dao, scope, machineId } = await fixture();
    const first = await dao.open({ ...scope, expectedRevision: 0, expiresAt: LATER });
    const second = await dao.open({ ...scope, expectedRevision: 0, expiresAt: LATER });
    const claimed = await dao.claim({ ownerUserId: scope.ownerUserId, machineId, now: NOW });
    expect(claimed).toMatchObject({ id: second.id, state: "claimed", machineId });
    expect(await dao.claim({ ownerUserId: scope.ownerUserId, machineId, now: NOW })).toBeNull();
    expect(await dao.settle({ requestId: second.id, machineId, state: "linked", reason: null })).toBe(true);
    expect(await dao.settle({ requestId: second.id, machineId, state: "failed", reason: "folder_not_selected" })).toBe(false);
    expect(await dao.settle({ requestId: first.id, machineId, state: "linked", reason: null })).toBe(false);
    expect(await dao.latest(scope)).toMatchObject({ id: second.id, state: "linked", reason: null });
  });
  it("never hands out a request that already expired", async () => {
    const { dao, scope, machineId } = await fixture();
    await dao.open({ ...scope, expectedRevision: 2, expiresAt: NOW });
    expect(await dao.claim({ ownerUserId: scope.ownerUserId, machineId, now: NOW })).toBeNull();
    expect(await dao.latest(scope)).toMatchObject({ state: "pending", expectedRevision: 2 });
  });
});
