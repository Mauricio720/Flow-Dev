import { afterEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { readySetup } from "./terminal-open-support";
import { seedSession } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const ALREADY_ACTIVE = "Já existe uma sessão aberta para esta tarefa. Abrir outra?";

async function decisionOf(setup: Awaited<ReturnType<typeof readySetup>>["setup"]) {
  const [session] = await setup.database.select().from(taskTerminalSessions);
  return session!.planningDecisionId;
}

describe("tasks.terminal.open with an active session", () => {
  it("V-08j refuses a second opening without allowAdditional, and opens it with allowAdditional", async () => {
    const { setup, harness } = await readySetup();
    await harness.caller.terminal.open(openInput(setup));
    const refused = await harness.caller.terminal.open(openInput(setup, { allowAdditional: false })).then(() => null, (caught: unknown) => caught as TRPCError);
    expect(refused).toMatchObject({ code: "CONFLICT", message: ALREADY_ACTIVE });
    expect(refused?.cause).toMatchObject({ reason: "session_already_active" });
    expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(1);
    expect(harness.launcher.commands).toHaveLength(1);
    await harness.caller.terminal.open(openInput(setup, { allowAdditional: true }));
    expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(2);
  });

  it("does not count another person's active session or the person's own ended session", async () => {
    const { setup, harness } = await readySetup();
    const first = await harness.caller.terminal.open(openInput(setup));
    const decisionId = await decisionOf(setup);
    await setup.database.update(taskTerminalSessions).set({ status: "ended", userId: setup.readerId }).where(eq(taskTerminalSessions.id, first.sessionId));
    await seedSession({ setup, decisionId }, { status: "ended" });
    await harness.caller.terminal.open(openInput(setup, { allowAdditional: false }));
    expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(3);
  });

  it("returns the same session for a resent request key even when allowAdditional is false", async () => {
    const { setup, harness } = await readySetup();
    const input = openInput(setup, { allowAdditional: false });
    const first = await harness.caller.terminal.open(input);
    const again = await harness.caller.terminal.open(input);
    expect(again.sessionId).toBe(first.sessionId);
  });
});
