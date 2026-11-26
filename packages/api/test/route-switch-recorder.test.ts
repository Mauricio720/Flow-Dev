import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskRouteSwitches } from "../src/infra/database/schema";
import { cycle, messagesOf, sendMessage, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const ROUTE_PROPOSAL_BLOCK = "```flow-dev-troca-de-rota\nrota: execucao_direta\nresumo: Mudança simples.\n- Escopo definido.\n```";

describe("session recorder route switch detection", () => {
  it("V-03c ignores a proposal block from assistant subagent text", async () => {
    const world = await workerWorld({ script: [{ kind: "subagent_text", text: ROUTE_PROPOSAL_BLOCK }] });
    const id = await world.open();
    await cycle(world);
    expect(await world.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.taskId, world.setup.taskId))).toEqual([]);
    expect(await messagesOf(world, id)).toEqual([]);
  });

  it("V-03d does not detect a proposal block sent by the operator", async () => {
    const world = await workerWorld();
    const id = await world.open();
    await sendMessage(world, id, ROUTE_PROPOSAL_BLOCK);
    expect(await world.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.taskId, world.setup.taskId))).toEqual([]);
  });

  it("V-03f keeps the assistant text when route detection fails", async () => {
    const world = await workerWorld({ script: [{ kind: "text", text: ROUTE_PROPOSAL_BLOCK }] }, { routeSwitches: { propose: async () => { throw new Error("detector caiu"); } } });
    const id = await world.open();
    await cycle(world);
    expect((await messagesOf(world, id)).map((row) => row.content)).toEqual([ROUTE_PROPOSAL_BLOCK]);
    expect(world.log.entries.find((entry) => entry.event === "route_switch_detect_failed")?.fields).toMatchObject({ sessionId: id, error: "detector caiu" });
  });
});
