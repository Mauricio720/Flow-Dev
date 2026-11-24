import { describe, expect, it, vi } from "vitest";
import type { SessionPrincipal } from "../../../context";
import { ReadAccessGate } from "./readAccessGate";

const READ_CHECK_TTL_MS = 10_000;
const PROJECT_ID = "project-1";
const OTHER_PROJECT_ID = "project-2";
const actor = { userId: "user-1" } as SessionPrincipal;

function gateAt(requireRead = vi.fn().mockResolvedValue(undefined)) {
  const clock = { now: 1_000 };
  return { clock, requireRead, gate: new ReadAccessGate({ requireRead }, () => clock.now) };
}

describe("ReadAccessGate", () => {
  it("checks the repository once and trusts it until the window ends", async () => {
    const { gate, clock, requireRead } = gateAt();
    await gate.require(actor, PROJECT_ID);
    clock.now += READ_CHECK_TTL_MS - 1;
    await gate.require(actor, PROJECT_ID);
    expect(requireRead).toHaveBeenCalledTimes(1);
  });

  it("checks the repository again once the window has ended", async () => {
    const { gate, clock, requireRead } = gateAt();
    await gate.require(actor, PROJECT_ID);
    clock.now += READ_CHECK_TTL_MS;
    await gate.require(actor, PROJECT_ID);
    expect(requireRead).toHaveBeenCalledTimes(2);
  });

  it("keeps a separate window for each project", async () => {
    const { gate, requireRead } = gateAt();
    await gate.require(actor, PROJECT_ID);
    await gate.require(actor, OTHER_PROJECT_ID);
    expect(requireRead).toHaveBeenCalledTimes(2);
  });

  it("propagates a refusal and does not remember it as an allowance", async () => {
    const denied = new Error("sem acesso");
    const { gate, requireRead } = gateAt(vi.fn().mockRejectedValueOnce(denied).mockResolvedValue(undefined));
    await expect(gate.require(actor, PROJECT_ID)).rejects.toBe(denied);
    await gate.require(actor, PROJECT_ID);
    expect(requireRead).toHaveBeenCalledTimes(2);
  });
});
