import { describe, expect, it } from "vitest";
import { summarizeHookEvent } from "../hookEventSummarizer";
import { codexHookEvents } from "./codexHookTranslator";
import { codexPromptHooks, codexSkillHook } from "./codexSkillActivity";

const THREAD = "thread-main";
const CHECKOUT = "/work/clone";
const summarize = (payload: unknown) => summarizeHookEvent(payload, CHECKOUT);
const item = (type: string, extra: Record<string, unknown> = {}) => ({ method: "item/completed", params: { threadId: THREAD, item: { type, ...extra } } });

describe("Codex event hooks", () => {
  it("emits one file event per path for add, update, delete and move without diff content", () => {
    const changes = [
      { kind: { type: "add" }, path: `${CHECKOUT}/src/add.ts`, diff: "SECRET-DIFF" },
      { kind: { type: "update", move_path: null }, path: `${CHECKOUT}/src/update.ts`, diff: "SECRET-DIFF" },
      { kind: { type: "delete" }, path: `${CHECKOUT}/src/delete.ts`, diff: "SECRET-DIFF" },
      { kind: { type: "update", move_path: `${CHECKOUT}/src/moved.ts` }, path: `${CHECKOUT}/src/move.ts`, diff: "SECRET-DIFF" },
    ];
    const hooks = codexHookEvents(item("fileChange", { changes }) as never, THREAD);
    expect(hooks).toHaveLength(5);
    const events = hooks.flatMap((hook) => summarize(hook).events);
    expect(events.map(({ kind, summary, path }) => [kind, summary, path])).toEqual([
      ["file_edit", "Criado: src/add.ts", "src/add.ts"],
      ["file_edit", "Editado: src/update.ts", "src/update.ts"],
      ["file_edit", "Removido: src/delete.ts", "src/delete.ts"],
      ["file_edit", "Movido: src/move.ts", "src/move.ts"],
      ["file_edit", "Movido: src/moved.ts", "src/moved.ts"],
    ]);
    expect(JSON.stringify(hooks)).not.toContain("SECRET-DIFF");
  });

  it("summarizes a completed command but never includes output or child thread activity", () => {
    const [hook] = codexHookEvents(item("commandExecution", { command: "pnpm test", stdout: "SECRET-OUTPUT" }) as never, THREAD);
    expect(summarize(hook).events[0]).toMatchObject({ kind: "command", summary: "pnpm test" });
    expect(JSON.stringify(hook)).not.toContain("SECRET-OUTPUT");
    expect(codexHookEvents(item("commandExecution", { command: "pwd" }) as never, "thread-child")).toEqual([]);
  });

  it("maps thread start, prompt, turn completion and explicit context skill activity", () => {
    expect(summarize(codexHookEvents({ method: "thread/started", params: { thread: { id: THREAD } } }, THREAD)[0]).events).toMatchObject([{ kind: "started", summary: "startup" }]);
    expect(summarize(codexHookEvents({ method: "thread/resumed", params: { threadId: THREAD } }, THREAD)[0]).events).toMatchObject([{ kind: "started", summary: "resume" }]);
    expect(codexHookEvents({ method: "turn/completed", params: { threadId: THREAD } }, THREAD)).toMatchObject([{ hook_event_name: "Stop" }]);
    expect(summarize(codexHookEvents({ method: "thread/closed", params: { threadId: THREAD } }, THREAD)[0]).events).toMatchObject([{ kind: "ended", summary: "completed" }]);
    const skill = codexSkillHook({ threadId: THREAD, name: "spec-writer", path: "/context/skills/spec-writer/SKILL.md", contextSkillsPath: "/context/skills" });
    expect(summarize(skill).events).toMatchObject([{ kind: "skill", skill: "spec-writer" }]);
    expect(codexPromptHooks({ threadId: THREAD, text: "escreva", skill: { threadId: THREAD, name: "spec-writer", path: "/context/skills/spec-writer/SKILL.md", contextSkillsPath: "/context/skills" } })).toHaveLength(2);
    expect(codexSkillHook({ threadId: THREAD, name: "unknown", path: "/clone/skills/unknown/SKILL.md", contextSkillsPath: "/context/skills" })).toBeNull();
  });
});
