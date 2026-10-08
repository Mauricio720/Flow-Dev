import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ controller: { consumeRateLimit: vi.fn(), poll: vi.fn() } }));
vi.mock("@flow-dev/api/server", () => ({ createProductionLocalMachineController: () => mocks.controller }));
import { POST } from "./route";

describe("POST /api/local-connector/poll", () => {
  beforeEach(() => { mocks.controller.consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 60 }); mocks.controller.poll.mockReset().mockResolvedValue({ protocolVersion: 1, commands: [] }); });

  it("rejects browser cookies before reading the machine request body", async () => {
    const response = await POST(new Request("https://flow.test/api/local-connector/poll", { method: "POST", headers: { cookie: "session=browser" }, body: "not-json" }));
    expect(response.status).toBe(401);
    expect(mocks.controller.consumeRateLimit).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("IT-179 validates a versioned body and returns only the bounded protocol response", async () => {
    const response = await POST(new Request("https://flow.test/api/local-connector/poll", { method: "POST", headers: { authorization: "Bearer opaque-token", "content-type": "application/json" }, body: JSON.stringify({ protocolVersion: 1, limit: 3 }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ protocolVersion: 1, commands: [] });
    expect(mocks.controller.poll).toHaveBeenCalledWith({ protocolVersion: 1, limit: 3, token: "opaque-token" });
  });

  it("IT-180 maps an incompatible protocol version to a bounded conflict response", async () => {
    mocks.controller.poll.mockRejectedValueOnce(Object.assign(new Error("protocol_incompatible"), { reason: "protocol_incompatible" }));
    const response = await POST(new Request("https://flow.test/api/local-connector/poll", { method: "POST", headers: { authorization: "Bearer opaque-token", "content-type": "application/json" }, body: JSON.stringify({ protocolVersion: 99, lastAcknowledgedCommand: null }) }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { reason: "protocol_incompatible" } });
  });

  it("rejects undeclared body fields without dispatching a poll", async () => {
    const response = await POST(new Request("https://flow.test/api/local-connector/poll", { method: "POST", headers: { authorization: "Bearer opaque-token", "content-type": "application/json" }, body: JSON.stringify({ protocolVersion: 1, limit: 3, path: "/private" }) }));
    expect(response.status).toBe(400);
    expect(mocks.controller.poll).not.toHaveBeenCalled();
  });
});
