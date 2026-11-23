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

const BIG_PROMPT_BYTES = Math.floor(4.9 * 1024 * 1024);
const world = () => routeWorld(POST);

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("POST /api/terminal-sessions/events", () => {
  it("V-07a answers 401 without a decision body for a missing, invalid or non-Bearer credential", async () => {
    const { post, events } = await world();
    const body = JSON.stringify(hook("UserPromptSubmit", { prompt: "oi" }));
    for (const headers of [{}, { authorization: "Bearer invalido" }, { authorization: "Basic abc" }]) {
      const response = await post(body, headers);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("");
    }
    expect(await events()).toHaveLength(0);
  });

  it("V-07b answers 204 and records nothing for a session already in a final state", async () => {
    const { post, send, events } = await world();
    await send(hook("SessionEnd", { reason: "other" }));
    const count = (await events()).length;
    const response = await post(JSON.stringify(hook("UserPromptSubmit", { prompt: "depois" })));
    expect(response.status).toBe(204);
    expect(await events()).toHaveLength(count);
  });

  it("V-07c answers 413 above 5 MB and counts the dropped event, but accepts 4.9 MB", async () => {
    const { post, session, events } = await world();
    expect((await post(new Uint8Array(MAX_BODY_BYTES + 1))).status).toBe(413);
    expect(await session()).toMatchObject({ droppedEvents: 1 });
    expect(await events()).toHaveLength(0);
    const big = JSON.stringify(hook("UserPromptSubmit", { prompt: "x".repeat(BIG_PROMPT_BYTES) }));
    expect((await post(big)).status).toBe(204);
    expect((await events()).map((event) => event.kind)).toEqual(["started", "prompt"]);
  });

  it("V-07d answers a valid event with 204, an empty body and no JSON content type", async () => {
    const { post, clone } = await world();
    const response = await post(JSON.stringify(editOf(clone, "src/a.ts")));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toBeNull();
  });

  it("answers 204 and records nothing for a body that is not JSON", async () => {
    const { post, events } = await world();
    expect((await post("não é json")).status).toBe(204);
    expect(await events()).toHaveLength(0);
  });
});
