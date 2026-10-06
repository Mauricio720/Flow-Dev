import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { response: { user: { id: string }; session: { id: string } }; headers: Headers } | null,
  contexts: [] as unknown[],
  fetchHandler: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn(async () => mocks.session) } } }));
vi.mock("@trpc/server/adapters/fetch", () => ({ fetchRequestHandler: mocks.fetchHandler }));

import { POST } from "./route";

beforeEach(() => {
  process.env.BETTER_AUTH_URL = "https://flow.test";
  mocks.contexts = [];
  mocks.session = { response: { user: { id: "user-1" }, session: { id: "session-1" } }, headers: new Headers({ "set-cookie": "session=verified; Path=/; HttpOnly" }) };
  mocks.fetchHandler.mockReset().mockImplementation(async (input: { createContext: () => Promise<unknown>; responseMeta: (input: { ctx: unknown }) => { headers: Headers } }) => {
    const context = await input.createContext();
    mocks.contexts.push(context);
    return new Response("ok", { status: 200, headers: input.responseMeta({ ctx: context }).headers });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("task tRPC request boundary", () => {
  it("UT-069 applies no-store and preserves verified session cookies", async () => {
    const response = await POST(request("https://flow.test"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("session=verified");
    expect(mocks.contexts[0]).toMatchObject({ principal: { userId: "user-1", sessionId: "session-1" } });
  });

  it("UT-070 blocks a foreign Origin before auth or tRPC dispatch", async () => {
    const response = await POST(request("https://evil.example"));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { reason: "origin_denied" } });
    expect(mocks.fetchHandler).not.toHaveBeenCalled();
  });
});

function request(origin: string) {
  return new Request("https://flow.test/api/trpc/tasks.list", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ json: { projectId: "00000000-0000-4000-8000-000000000001", limit: 30 } }) });
}
