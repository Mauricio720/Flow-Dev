import { afterEach, describe, expect, it, vi } from "vitest";
import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import { InflightTracker } from "./inflightTracker";
import { PendingRequestRegistry } from "./pendingRequestRegistry";
import { SessionRequestBroker } from "./sessionRequestBroker";

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
  const broker = new SessionRequestBroker({ requests: requests as never, status, registry, tracker: new InflightTracker(), log });
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
});
