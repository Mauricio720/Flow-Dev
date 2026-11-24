import { afterEach, describe, expect, it, vi } from "vitest";
import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import { InflightTracker } from "./inflightTracker";
import { PendingRequestRegistry } from "./pendingRequestRegistry";
import { SessionRequestBroker } from "./sessionRequestBroker";
import { RequestCancellation } from "./requestCancellation";
import { SessionRequestGate } from "./sessionRequestGate";

afterEach(() => {
  vi.useRealTimers();
});

const THIRTY_MINUTES_MS = 30 * 60_000;
const session = { id: "s1", permissionMode: "ask_all", checkoutPath: "/work/shop" } as TerminalSessionRecord;

function brokerWithFakeStore() {
  const registry = new PendingRequestRegistry();
  const requests = { insertRequest: vi.fn(async (input: { kind: string }) => ({ id: "r1", kind: input.kind })) };
  const status = { transition: vi.fn(async () => null) };
  const log = { info: vi.fn(), error: vi.fn() };
  const broker = new SessionRequestBroker({ requests: requests as never, status, registry, tracker: new InflightTracker(), gate: new SessionRequestGate(), log });
  return { broker, registry, requests };
}

describe("SessionRequestBroker", () => {
  it("V-24f keeps a request open with no deadline: still unresolved and registered after 30 minutes of timers", async () => {
    vi.useFakeTimers();
    const { broker, registry, requests } = brokerWithFakeStore();
    let settled = false;
    void broker.handle(session, { toolName: "Bash", input: { command: "pnpm test" }, toolUseId: "toolu_1", suggestions: [] }).then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(THIRTY_MINUTES_MS);
    expect(requests.insertRequest).toHaveBeenCalledOnce();
    expect(settled).toBe(false);
    expect(registry.ids()).toEqual(["r1"]);
    registry.take("r1")!.resolve({ behavior: "allow" });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(true);
  });

  it("serializes cancellation between persistence and registry registration", async () => {
    const registry = new PendingRequestRegistry();
    const gate = new SessionRequestGate();
    let releaseTransition!: () => void;
    let enteredTransition!: () => void;
    const transitionEntered = new Promise<void>((resolve) => { enteredTransition = resolve; });
    const transitionBarrier = new Promise<void>((resolve) => { releaseTransition = resolve; });
    let state = "pending";
    const requests = { insertRequest: vi.fn(async () => ({ id: "r1", kind: "permission", status: "pending" })), cancelPending: vi.fn(async () => { state = "cancelled"; return ["r1"]; }), pendingIds: vi.fn(async () => state === "pending" ? ["r1"] : []) };
    const status = { transition: vi.fn(async () => { enteredTransition(); await transitionBarrier; return null; }) };
    const log = { info: vi.fn(), error: vi.fn() };
    const broker = new SessionRequestBroker({ requests: requests as never, status, registry, tracker: new InflightTracker(), gate, log });
    const cancellation = new RequestCancellation({ requests: requests as never, registry, gate, now: () => new Date() });
    const decision = broker.handle(session, { toolName: "Bash", input: { command: "pnpm test" }, toolUseId: "toolu_1", suggestions: [] });
    await transitionEntered;
    const cancelled = cancellation.cancelAll(session.id);
    releaseTransition();
    await cancelled;
    expect(await decision).toMatchObject({ behavior: "deny", message: "Interrompido pela pessoa" });
    expect(registry.ids()).toEqual([]);
    expect(state).toBe("cancelled");
  });

  it("serializes cancellation while insertion is still in flight", async () => {
    const registry = new PendingRequestRegistry();
    const gate = new SessionRequestGate();
    let releaseInsert!: () => void;
    let enteredInsert!: () => void;
    const insertEntered = new Promise<void>((resolve) => { enteredInsert = resolve; });
    const insertBarrier = new Promise<void>((resolve) => { releaseInsert = resolve; });
    const requests = { insertRequest: vi.fn(async () => { enteredInsert(); await insertBarrier; return { id: "r1", kind: "permission" }; }), cancelPending: vi.fn(async () => ["r1"]), pendingIds: vi.fn(async () => []) };
    const status = { transition: vi.fn(async () => null) };
    const log = { info: vi.fn(), error: vi.fn() };
    const broker = new SessionRequestBroker({ requests: requests as never, status, registry, tracker: new InflightTracker(), gate, log });
    const cancellation = new RequestCancellation({ requests: requests as never, registry, gate, now: () => new Date() });
    const decision = broker.handle(session, { toolName: "Bash", input: { command: "pnpm test" }, toolUseId: "toolu_1", suggestions: [] });
    await insertEntered;
    const cancelled = cancellation.cancelAll(session.id);
    releaseInsert();
    await cancelled;
    expect(await decision).toMatchObject({ behavior: "deny", message: "Interrompido pela pessoa" });
    expect(registry.ids()).toEqual([]);
  });
});
