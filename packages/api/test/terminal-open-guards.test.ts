import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { rm } from "node:fs/promises";
import { TRPCError } from "@trpc/server";
import { taskIssueClaims, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { approvedWork, cleanupTerminalFolders, gitClone, linkClone, openInput } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

type Harness = Awaited<ReturnType<typeof terminalHarness>>;
type Setup = Awaited<ReturnType<typeof approvedWork>>;

async function refusal(setup: Setup, harness: Harness, input: Record<string, unknown> = {}) {
  const error = await harness.caller.terminal.open(openInput(setup, input) as never).then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(TRPCError);
  expect(harness.launcher.commands).toHaveLength(0);
  expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
  return error as TRPCError & { cause?: { reason: string } };
}

async function readySetup(options: Parameters<typeof terminalHarness>[1] = {}) {
  const setup = await approvedWork();
  await linkClone(setup, await gitClone());
  return { setup, harness: await terminalHarness(setup, options) };
}

describe("tasks.terminal.open guards", () => {
  it("V-03d refuses with the REQ-011 message when the linked folder was deleted", async () => {
    const setup = await approvedWork();
    const clone = await gitClone();
    await linkClone(setup, clone);
    await rm(clone, { recursive: true, force: true });
    const error = await refusal(setup, await terminalHarness(setup));
    expect(error.message).toBe("A pasta vinculada não é mais um clone válido de acme/private. Atualize o vínculo nas Configurações.");
    expect(error.cause?.reason).toBe("checkout_invalid");
  });

  it("V-03d refuses when the linked clone no longer points at the project repository", async () => {
    const setup = await approvedWork();
    await linkClone(setup, await gitClone("https://github.com/acme/blog.git"));
    const error = await refusal(setup, await terminalHarness(setup));
    expect(error.cause?.reason).toBe("checkout_invalid");
  });

  it("refuses without a linked folder", async () => {
    const setup = await approvedWork();
    expect((await refusal(setup, await terminalHarness(setup))).cause?.reason).toBe("checkout_missing");
  });

  it("V-03e names the missing Claude Code", async () => {
    const { setup, harness } = await readySetup({ missingTools: ["claude"] });
    expect((await refusal(setup, harness)).message).toBe("Claude Code não encontrado no PATH.");
  });

  it("V-03f names the missing GNOME Terminal", async () => {
    const { setup, harness } = await readySetup({ missingTools: ["gnome-terminal"] });
    expect((await refusal(setup, harness)).message).toBe("GNOME Terminal não encontrado.");
  });

  it("V-03g names the missing skill", async () => {
    const { setup, harness } = await readySetup({ missingSkills: ["spec-conformance"] });
    const error = await refusal(setup, harness);
    expect(error.message).toBe("Skill spec-conformance não encontrada no Flow Dev.");
    expect(error.cause?.reason).toBe("skill_missing");
  });

  it("V-03h refuses an empty prompt and one with 20.001 characters", async () => {
    const { setup, harness } = await readySetup();
    for (const prompt of ["", "   ", "a".repeat(20_001)]) expect((await refusal(setup, harness, { prompt })).cause?.reason).toBe("prompt_invalid");
  });

  it("V-03k refuses when the claim moved to someone else after the preflight", async () => {
    const { setup, harness } = await readySetup();
    await harness.caller.terminal.preflight({ projectId: setup.project.id, taskId: setup.taskId });
    const [claim] = await setup.database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
    await setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, setup.taskId));
    await setup.database.insert(taskIssueClaims).values({ ...claim!, id: crypto.randomUUID(), candidateUserId: setup.readerId, operatorUserId: setup.readerId });
    const error = await refusal(setup, harness);
    expect(error).toMatchObject({ code: "FORBIDDEN", message: "Somente a pessoa operadora desta Issue pode agir." });
    expect(error.cause?.reason).toBe("operator_required");
  });

  it("V-03l refuses with the Q-01 message when the switch is off", async () => {
    const { setup, harness } = await readySetup({ enabled: false });
    const error = await refusal(setup, harness);
    expect(error.message).toBe("A abertura no terminal está desligada. Defina FLOW_DEV_TERMINAL_ENABLED=true no .env.local e reinicie o Flow Dev.");
    expect(error.cause?.reason).toBe("terminal_disabled");
  });

  it("keeps attachments for the attachment task: ids are refused as missing for now", async () => {
    const { setup, harness } = await readySetup();
    const error = await refusal(setup, harness, { attachmentIds: [crypto.randomUUID()] });
    expect(error.cause?.reason).toBe("attachment_missing");
  });
});
