import { describe, expect, it, vi } from "vitest";
import { createLocalMachinesRouter } from "./localMachines";
import type { LocalMachineController } from "../controllers/localMachineController";

const code = "pairing-code-123456";
const requestKey = "40000000-0000-4000-8000-000000000001";

describe("localMachines router", () => {
  it("requires a session for browser pairing and machine operations", async () => {
    const caller = createLocalMachinesRouter({} as LocalMachineController).createCaller({ principal: null, requestId: "unit", responseHeaders: undefined });
    await expect(caller.pairingPreview({ code })).rejects.toMatchObject({ code: "UNAUTHORIZED", cause: { reason: "session_required" } });
    await expect(caller.confirmPairing({ code, requestKey })).rejects.toMatchObject({ code: "UNAUTHORIZED", cause: { reason: "session_required" } });
    await expect(caller.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED", cause: { reason: "session_required" } });
    await expect(caller.revoke({ machineId: "10000000-0000-4000-8000-000000000001", expectedRevision: 1, requestKey })).rejects.toMatchObject({ code: "UNAUTHORIZED", cause: { reason: "session_required" } });
  });

  it("binds confirmation and list calls to the session principal", async () => {
    const controller = {
      confirmPairing: vi.fn(async (actor: { userId: string }, input: { code: string; requestKey: string }) => ({ pairingId: "pairing-1", owner: actor.userId, code: input.code, requestKey: input.requestKey })),
      list: vi.fn(async (actor: { userId: string }) => ({ items: [{ id: "machine-1", owner: actor.userId, label: "Laptop", readiness: "offline" }], nextCursor: null })),
    } as unknown as LocalMachineController;
    const caller = createLocalMachinesRouter(controller).createCaller({ principal: { userId: "user-1" }, requestId: "unit", responseHeaders: undefined });
    await expect(caller.confirmPairing({ code, requestKey })).resolves.toMatchObject({ owner: "user-1", code });
    await expect(caller.list({})).resolves.toMatchObject({ items: [{ owner: "user-1", label: "Laptop" }] });
    expect(controller.confirmPairing).toHaveBeenCalledWith({ userId: "user-1" }, { code, requestKey });
    expect(controller.list).toHaveBeenCalledWith({ userId: "user-1" }, { limit: 20 });
  });

  it("rejects unknown request fields before reaching the controller", async () => {
    const confirmPairing = vi.fn();
    const controller = { confirmPairing } as unknown as LocalMachineController;
    const caller = createLocalMachinesRouter(controller).createCaller({ principal: { userId: "user-1" }, requestId: "unit", responseHeaders: undefined });
    await expect(caller.confirmPairing({ code, requestKey, ownerUserId: "foreign-user" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(confirmPairing).not.toHaveBeenCalled();
  });
});
