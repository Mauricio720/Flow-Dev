import { afterEach, describe, expect, it } from "vitest";
import { stat } from "node:fs/promises";
import { taskTerminalEvents } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { editOf, hook, openedSession, skillOf } from "./terminal-event-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("terminal event ingestion", () => {
  it("V-07g records started and prompt, moves the session to running and refreshes the last signal", async () => {
    const { send, session, events } = await openedSession();
    const before = (await session()).lastSignalAt;
    await send(hook("SessionStart", { source: "startup" }));
    await send(hook("UserPromptSubmit", { prompt: "faça isto" }));
    expect((await events()).map((event) => [event.kind, event.summary])).toEqual([["started", "startup"], ["prompt", "faça isto"]]);
    expect(await session()).toMatchObject({ status: "running", claudeSessionId: "claude-session-1" });
    const after = await session();
    expect(after.startedAt).not.toBeNull();
    expect(after.lastSignalAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("records an implicit started event because SessionStart never arrives over http hooks", async () => {
    const { send, session, events } = await openedSession();
    await send(hook("UserPromptSubmit", { prompt: "oi" }));
    await send(hook("UserPromptSubmit", { prompt: "de novo" }));
    expect((await events()).map((event) => event.kind)).toEqual(["started", "prompt", "prompt"]);
    expect(await session()).toMatchObject({ status: "running" });
  });

  it("V-07h attributes edits to the active skill until Stop clears it", async () => {
    const { send, session, events, clone } = await openedSession();
    await send(skillOf("spec-writer"));
    await send(editOf(clone, "docs/specs/x/spec.md"));
    await send(hook("Stop"));
    expect(await session()).toMatchObject({ status: "waiting", activeSkill: null });
    await send(editOf(clone, "README.md"));
    const edits = (await events()).filter((event) => event.kind === "file_edit");
    expect(edits.map((event) => [event.path, event.skill])).toEqual([["docs/specs/x/spec.md", "spec-writer"], ["README.md", null]]);
  });

  it("V-07i gives each file the skill active when it was edited in the same turn", async () => {
    const { send, events, clone } = await openedSession();
    await send(skillOf("spec-writer"));
    await send(editOf(clone, "a.md"));
    await send(skillOf("spec-to-tasks"));
    await send(editOf(clone, "b.md"));
    const edits = (await events()).filter((event) => event.kind === "file_edit");
    expect(edits.map((event) => [event.path, event.skill])).toEqual([["a.md", "spec-writer"], ["b.md", "spec-to-tasks"]]);
  });

  it("V-07j ends the session, removes the settings file and ignores later events with the same token", async () => {
    const { send, session, events, settingsPath } = await openedSession();
    await send(hook("UserPromptSubmit", { prompt: "oi" }));
    await send(hook("SessionEnd", { reason: "prompt_input_exit" }));
    const ended = await session();
    expect(ended).toMatchObject({ status: "ended", endReason: "prompt_input_exit" });
    expect(ended.endedAt).not.toBeNull();
    await expect(stat(settingsPath)).rejects.toThrow();
    const count = (await events()).length;
    await send(hook("UserPromptSubmit", { prompt: "depois" }));
    expect(await events()).toHaveLength(count);
    expect(await session()).toMatchObject({ status: "ended" });
  });

  it("keeps the session alive when SessionEnd comes from /clear", async () => {
    const { send, session, settingsPath } = await openedSession();
    await send(hook("UserPromptSubmit", { prompt: "oi" }));
    const result = await send(hook("SessionEnd", { reason: "clear" }));
    expect(result).toEqual({ captureTrigger: "session_end" });
    expect(await session()).toMatchObject({ status: "running", endedAt: null });
    expect((await stat(settingsPath)).isFile()).toBe(true);
  });

  it("V-07k refuses unknown tokens, a missing token and the token of a deleted session", async () => {
    const { controller, setup, token, sessionId } = await openedSession();
    expect(await controller.authenticate("token-aleatorio")).toBeNull();
    expect(await controller.authenticate(null)).toBeNull();
    expect(await controller.authenticate(token)).toEqual({ sessionId, active: true });
    await setup.client`delete from task_terminal_sessions`;
    expect(await controller.authenticate(token)).toBeNull();
    expect(await setup.database.select().from(taskTerminalEvents)).toHaveLength(0);
  });
});
