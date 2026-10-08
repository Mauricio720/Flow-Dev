import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createPairing: vi.fn(),
  exchange: vi.fn(),
  heartbeat: vi.fn(),
  publish: vi.fn(),
  poll: vi.fn(),
  events: vi.fn(),
  unpair: vi.fn(),
  claim: vi.fn(),
  settle: vi.fn(),
}));

vi.mock("@flow-dev/api/server", () => ({ createProductionLocalMachineController: () => mocks, createProductionLocalProjectLinkController: () => mocks, createProductionLocalLinkRequestController: () => mocks }));

import { POST as pair } from "./pairings/route";
import { POST as exchange } from "./pairings/exchange/route";
import { POST as heartbeat } from "./heartbeat/route";
import { POST as links } from "./links/route";
import { POST as poll } from "./poll/route";
import { POST as events } from "./events/route";
import { POST as unpair } from "./unpair/route";
import { POST as claimLinkRequest } from "./link-requests/claim/route";
import { POST as settleLinkRequest } from "./link-requests/settle/route";

const validPairingBody = JSON.stringify({ protocolVersion: 1, label: "Laptop", pollingSecret: "p".repeat(48) });
const validMachineBody = JSON.stringify({ protocolVersion: 1, requestKey: "11111111-1111-4111-8111-111111111111" });
const routes = [
  { name: "pairings", post: pair, pairing: true, operation: "createPairing", body: validPairingBody },
  { name: "exchange", post: exchange, pairing: true, operation: "exchange", body: JSON.stringify({ pairingId: "22222222-2222-4222-8222-222222222222", pollingSecret: "p".repeat(48), requestKey: "11111111-1111-4111-8111-111111111111" }) },
  { name: "heartbeat", post: heartbeat, pairing: false, operation: "heartbeat", body: JSON.stringify({ protocolVersion: 1, capabilities: [], catalogRevision: 1, requestKey: "11111111-1111-4111-8111-111111111111" }) },
  { name: "links", post: links, pairing: false, operation: "publish", body: JSON.stringify({ protocolVersion: 1, projectId: "22222222-2222-4222-8222-222222222222", checkoutHandle: "a".repeat(64), checkoutKey: "b".repeat(64), repositoryOwner: "acme", repositoryName: "flow", safeLabel: "flow", expectedRevision: 0, requestKey: "11111111-1111-4111-8111-111111111111" }) },
  { name: "poll", post: poll, pairing: false, operation: "poll", body: JSON.stringify({ protocolVersion: 1 }) },
  { name: "events", post: events, pairing: false, operation: "events", body: JSON.stringify({ protocolVersion: 1, events: [{ bad: true }] }) },
  { name: "unpair", post: unpair, pairing: false, operation: "unpair", body: validMachineBody },
  { name: "link request claim", post: claimLinkRequest, pairing: false, operation: "claim", body: JSON.stringify({ protocolVersion: 1 }) },
  { name: "link request settle", post: settleLinkRequest, pairing: false, operation: "settle", body: JSON.stringify({ protocolVersion: 1, requestId: "22222222-2222-4222-8222-222222222222", outcome: "failed", reason: "folder_not_selected" }) },
] as const;

describe("local connector route safety contracts", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", "https://flow.test");
    for (const value of Object.values(mocks)) value.mockReset();
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 30 });
    for (const route of routes) mocks[route.operation].mockResolvedValue({ protocolVersion: 1, commands: [], acknowledgements: [] });
  });

  it.each([
    ["IT-163", routes[0], 201],
    ["IT-167", routes[1], 201],
    ["IT-171", routes[2], 200],
    ["IT-174", routes[3], 200],
    ["IT-179", routes[4], 200],
    ["IT-181", routes[5], 200],
  ] as const)("%s reaches the actual $name route and returns its bounded protocol response", async (testId, route, status) => {
    const result = testId === "IT-163"
      ? { pairingId: "33333333-3333-4333-8333-333333333333", code: "public-code", expiresAt: new Date(Date.now() + 60_000).toISOString() }
      : testId === "IT-167"
        ? { state: "complete", machineId: "44444444-4444-4444-8444-444444444444", token: "opaque-machine-token", expiresAt: new Date(Date.now() + 60_000).toISOString() }
        : { protocolVersion: 1, commands: [], acknowledgements: [{ acknowledgedSequence: 1 }] };
    mocks[route.operation].mockResolvedValueOnce(result);
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(status);
    const body = await response.json();
    if (testId === "IT-163") expect(body).toMatchObject({ ...result, confirmationUrl: "https://flow.test/settings/local-machine/pairing/public-code" });
    else expect(body).toEqual(result);
    expect(mocks[route.operation]).toHaveBeenCalledTimes(1);
  });

  it("IT-192 returns pending exchange without issuing a machine credential", async () => {
    mocks.exchange.mockResolvedValueOnce({ state: "pending" });
    const route = routes[1];
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ state: "pending" });
  });

  it.each([
    ["IT-165", routes[0], "protocol_incompatible", 409],
    ["IT-168", routes[1], "pairing_secret_invalid", 401],
    ["IT-169", routes[1], "pairing_expired", 410],
    ["IT-170", routes[1], "pairing_consumed", 409],
    ["IT-172", routes[2], "protocol_incompatible", 409],
    ["IT-173", routes[2], "catalog_changed", 409],
    ["IT-175", routes[3], "project_unavailable", 404],
    ["IT-176", routes[3], "repository_mismatch", 412],
    ["IT-177", routes[3], "link_changed", 409],
    ["IT-178", routes[3], "request_key_reused", 409],
    ["IT-180", routes[4], "protocol_incompatible", 409],
    ["IT-182", routes[5], "command_unavailable", 404],
    ["IT-183", routes[5], "stale_fence", 409],
    ["IT-184", routes[5], "event_conflict", 409],
    ["IT-185", routes[5], "event_gap", 409],
    ["IT-186", routes[5], "evidence_rejected", 412],
  ] as const)("%s returns the bounded %s endpoint error", async (_testId, route, reason, status) => {
    mocks[route.operation].mockRejectedValueOnce(Object.assign(new Error("private diagnostic"), { reason }));
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(status);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({ error: { reason } });
    expect(body).not.toContain("private diagnostic");
  });

  it.each(routes)("maps a protocol version conflict to a bounded response on $name", async (route) => {
    mocks[route.operation].mockRejectedValueOnce(Object.assign(new Error("private detail"), { reason: "protocol_incompatible" }));
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { reason: "protocol_incompatible" } });
  });

  it.each(routes)("IT-187 rejects malformed JSON on $name without calling its controller", async (route) => {
    const response = await post(route, request(route, "{"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { reason: "invalid_input" } });
    expect(mocks[route.operation]).not.toHaveBeenCalled();
  });

  it.each(routes)("IT-188 rejects an oversized body on $name", async (route) => {
    const response = await post(route, request(route, " ".repeat(262_145)));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { reason: "payload_too_large" } });
    expect(mocks[route.operation]).not.toHaveBeenCalled();
  });

  it.each(routes)("IT-189 applies the endpoint rate limit on $name", async (route) => {
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 30 });
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toMatchObject({ error: { reason: "rate_limited" } });
    expect(mocks[route.operation]).not.toHaveBeenCalled();
  });

  it.each(routes)("IT-190 hides internal exception details on $name", async (route) => {
    mocks[route.operation].mockRejectedValueOnce(new Error("ENV_CANARY_123 private diagnostic"));
    const response = await post(route, request(route, route.body));
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("internal_error");
    expect(body).not.toContain("ENV_CANARY_123");
    expect(body).not.toContain("private diagnostic");
  });

  it.each(routes.filter((route) => !route.pairing))("IT-191 rejects missing bearer credentials on $name", async (route) => {
    const response = await post(route, request(route, route.body, false));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { reason: "machine_unauthorized" } });
    expect(mocks[route.operation]).not.toHaveBeenCalled();
  });
});

function request(route: { pairing: boolean }, body: string, bearer = true) {
  return new Request(`https://flow.test/api/local-connector/${route.pairing ? "pairings" : "machine"}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(!route.pairing && bearer ? { authorization: "Bearer opaque-token" } : {}) },
    body,
  });
}

async function post(route: { post: (request: Request) => Promise<Response | undefined> | Response | undefined }, request: Request) {
  const response = await route.post(request);
  if (!response) throw new Error("connector route did not return a response");
  return response;
}
