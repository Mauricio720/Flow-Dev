import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskContextCapabilities } from "../src/infra/database/schema";
import { registerContextMcpCleanup, search, setup } from "./context-mcp-support";

registerContextMcpCleanup();

describe("context MCP endpoint access", () => {
  it("V-06c refuses a foreign capability and an expired one without recording anything", async () => {
    const { world, claim, connect, dao } = await setup();
    const foreign = await (await connect("f".repeat(48))).callTool(search);
    expect(foreign.isError).toBe(true);
    await world.database.update(taskContextCapabilities).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(taskContextCapabilities.executionId, claim.executionId));
    const expired = await (await connect(claim.contextCapability)).callTool(search);
    expect(expired.isError).toBe(true);
    expect(await dao.listCalls(claim.executionId)).toEqual([]);
  });

  it("V-06f refuses malformed bearers before the controller and never logs them", async () => {
    const { endpoint, claim, handle } = await setup();
    const logs = [vi.spyOn(console, "info"), vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")];
    const bearers = ["has space inside", 'quote"inside', "x".repeat(129), ""];
    for (const bearer of bearers) {
      const response = await fetch(endpoint.urlFor(claim.executionId), { method: "POST", headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" }, body: "{}" });
      expect(response.status).toBe(401);
    }
    expect(handle).not.toHaveBeenCalled();
    const printed = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
    expect(bearers.filter(Boolean).some((bearer) => printed.includes(bearer))).toBe(false);
  });

  it("V-06i answers 404 outside /mcp/<uuid> and listens only on loopback", async () => {
    const { endpoint, claim } = await setup();
    const base = new URL(endpoint.urlFor(claim.executionId));
    expect(base.hostname).toBe("127.0.0.1");
    expect((await fetch(`${base.origin}/outro`)).status).toBe(404);
    expect((await fetch(`${base.origin}/mcp/not-a-uuid`, { method: "POST" })).status).toBe(404);
  });

  it("closes the port when stopped", async () => {
    const { endpoint, claim } = await setup();
    const url = endpoint.urlFor(claim.executionId);
    await endpoint.stop();
    await expect(fetch(url, { method: "POST" })).rejects.toThrow();
  });
});
