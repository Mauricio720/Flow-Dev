import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));
vi.mock("@flow-dev/api/server", async () => {
  const support = await import("./terminal-event-route-support");
  return { createProductionTerminalEventController: () => support.routeDelegate };
});

import { POST } from "../../../apps/web/src/app/api/terminal-sessions/events/route";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { editOf, hook } from "./terminal-event-support";
import { MAX_BODY_BYTES, routeWorld } from "./terminal-event-route-support";

const REQUESTS_FOR_LATENCY = 50;
const P95_RANK = Math.ceil(REQUESTS_FOR_LATENCY * 0.95);
const P95_LIMIT_MS = 200;
const world = () => routeWorld(POST);

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("POST /api/terminal-sessions/events limits and logs", () => {
  it("V-07l keeps the p95 response time of sequential PostToolUse events under 200 ms", async () => {
    const { post, clone } = await world();
    const body = JSON.stringify(editOf(clone, "src/a.ts"));
    const durations: number[] = [];
    for (let index = 0; index < REQUESTS_FOR_LATENCY; index += 1) {
      const start = performance.now();
      await post(body);
      durations.push(performance.now() - start);
    }
    durations.sort((a, b) => a - b);
    expect(durations[P95_RANK - 1]!).toBeLessThanOrEqual(P95_LIMIT_MS);
  });

  it("answers 204 without counting a dropped event when the session is already final", async () => {
    const { post, send, session } = await world();
    await send(hook("SessionEnd", { reason: "other" }));
    expect((await post(new Uint8Array(MAX_BODY_BYTES + 1))).status).toBe(204);
    expect(await session()).toMatchObject({ droppedEvents: 0 });
  });

  it("V-07m logs a [terminal] line for a refused token and an oversized body, without the token", async () => {
    const { post, token } = await world();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await post("{}", { authorization: "Bearer segredo-invalido" });
    await post(new Uint8Array(MAX_BODY_BYTES + 1));
    const lines = warn.mock.calls.map((call) => String(call[0]));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.startsWith("[terminal]")).toBe(true);
      expect(line).not.toContain("segredo-invalido");
      expect(line).not.toContain(token);
    }
  });
});
