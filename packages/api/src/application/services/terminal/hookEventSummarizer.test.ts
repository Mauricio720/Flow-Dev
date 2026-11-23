import { describe, expect, it } from "vitest";
import { FIXTURE_CHECKOUT as CHECKOUT, hookFixture as fixture, postToolUsePayload as postToolUse, promptPayload as prompt } from "../../../../test/terminal-hook-payloads";
import { summarizeHookEvent } from "./hookEventSummarizer";

const BUILT_IN_COMMAND_NAMES = ["exit", "clear", "compact", "help", "resume", "model", "config", "status", "quit"];
const summarize = (payload: unknown) => summarizeHookEvent(payload, CHECKOUT);
const kinds = (payload: unknown) => summarize(payload).events.map((event) => event.kind);

describe("hook event summarizer", () => {
  it("V-06a turns SessionStart into started with the Claude session id", () => {
    const result = summarize(fixture("session-start"));
    expect(result.events).toEqual([{ kind: "started", summary: "startup", path: null, skill: null }]);
    expect(result.claudeSessionId).toBe("3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f");
  });

  it("V-06b cuts the prompt at 500 characters", () => {
    const [event] = summarize(prompt("p".repeat(501))).events;
    expect(event).toMatchObject({ kind: "prompt", summary: "p".repeat(500) });
  });

  it("V-06c records the relative path of every file edit tool", () => {
    for (const tool of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) {
      const key = tool === "NotebookEdit" ? "notebook_path" : "file_path";
      const [event] = summarize(postToolUse(tool, { [key]: `${CHECKOUT}/src/components/LoginButton.tsx` })).events;
      expect(event).toEqual({ kind: "file_edit", summary: "src/components/LoginButton.tsx", path: "src/components/LoginButton.tsx", skill: null });
    }
    for (const name of ["post-tool-use-write", "post-tool-use-edit"]) expect(summarize(fixture(name)).events[0]).toMatchObject({ path: "docs/nota.md" });
  });

  it("V-06d keeps the first line of a command, cut at 200 characters", () => {
    expect(summarize(postToolUse("Bash", { command: "pnpm test\necho fim" })).events[0]).toMatchObject({ kind: "command", summary: "pnpm test" });
    expect(summarize(postToolUse("Bash", { command: "c".repeat(300) })).events[0]!.summary).toBe("c".repeat(200));
    expect(summarize(fixture("post-tool-use-bash")).events[0]).toMatchObject({ summary: "echo fim" });
  });

  it("V-06e maps Stop, Notification and SessionEnd", () => {
    expect(summarize(fixture("stop"))).toMatchObject({ events: [{ kind: "waiting" }], captureTrigger: "stop" });
    expect(summarize(fixture("notification")).events[0]).toMatchObject({ kind: "attention", summary: "Claude is waiting for your input" });
    expect(summarize(fixture("session-end-exit"))).toMatchObject({ events: [{ kind: "ended", summary: "prompt_input_exit" }], endReason: "prompt_input_exit", captureTrigger: "session_end" });
    expect(summarize(fixture("session-end-window-closed")).endReason).toBe("other");
  });

  it("V-06f ignores tools outside the filter", () => {
    expect(summarize(fixture("post-tool-use-read")).events).toEqual([]);
    expect(kinds(postToolUse("Grep", { pattern: "x" }))).toEqual([]);
    expect(kinds(postToolUse("Mystery", { file_path: "/a" }))).toEqual([]);
  });

  it("V-06g detects a skill only at the start of the prompt, with or without the plugin namespace", () => {
    for (const text of ["/spec-writer escreva", "/flow-dev:spec-writer escreva"]) {
      expect(summarize(prompt(text)).events.map((event) => [event.kind, event.skill])).toEqual([["prompt", null], ["skill", "spec-writer"]]);
    }
    expect(kinds(prompt("use /spec-writer depois"))).toEqual(["prompt"]);
    expect(summarize(fixture("user-prompt-submit-skill")).events[1]).toMatchObject({ kind: "skill", skill: "spike-skill" });
  });

  it("V-06h does not treat built-in commands as skills", () => {
    for (const name of BUILT_IN_COMMAND_NAMES) expect(kinds(prompt(`/${name}`))).toEqual(["prompt"]);
  });

  it("V-06i turns the Skill tool into a skill event with the normalized name", () => {
    expect(summarize(fixture("post-tool-use-skill")).events).toEqual([{ kind: "skill", summary: "spike-skill", path: null, skill: "spike-skill" }]);
  });

  it("V-06j tolerates malformed payloads", () => {
    for (const payload of [null, undefined, {}, [], "texto", { hook_event_name: "Mystery" }, postToolUse("Bash", "texto"), postToolUse("Write", null)]) {
      expect(summarize(payload).events).toEqual([]);
    }
  });

  it("V-06k never copies tool output, file content or edited text", () => {
    const secret = "SEGREDO-XYZ";
    const payloads = [
      { ...postToolUse("Write", { file_path: `${CHECKOUT}/a.md`, content: secret }), tool_response: { content: secret, stdout: secret } },
      { ...postToolUse("Edit", { file_path: `${CHECKOUT}/a.md`, new_string: secret, old_string: secret }), tool_response: { newString: secret } },
      { ...postToolUse("Bash", { command: "echo oi" }), tool_response: { stdout: secret, stderr: secret } },
      { hook_event_name: "Stop", last_assistant_message: secret },
    ];
    for (const payload of payloads) expect(JSON.stringify(summarize(payload))).not.toContain(secret);
  });

  it("clips the summary of long paths and skill names to 500 characters while keeping the full path", () => {
    const longPath = `/tmp/${"a".repeat(600)}.md`;
    expect(summarize(postToolUse("Write", { file_path: longPath })).events[0]).toMatchObject({ summary: longPath.slice(0, 500), path: longPath });
    expect(summarize(postToolUse("Skill", { skill: "s".repeat(600) })).events[0]!.summary).toHaveLength(500);
  });

  it("V-06l keeps the absolute path of a file outside the checkout", () => {
    expect(summarize(postToolUse("Write", { file_path: "/tmp/nota.md" })).events[0]).toMatchObject({ kind: "file_edit", path: "/tmp/nota.md", summary: "/tmp/nota.md" });
  });

  it("does not end the session on SessionEnd caused by /clear", () => {
    expect(summarize(fixture("session-end-clear"))).toMatchObject({ events: [], endReason: null, captureTrigger: "session_end" });
  });
});
