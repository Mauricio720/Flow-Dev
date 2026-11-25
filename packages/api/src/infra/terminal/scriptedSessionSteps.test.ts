import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionPurposeKind } from "../../application/terminal/sessionPurposeKind";
import { ScriptedSessionRuntime } from "./scriptedSessionRuntime";
import { scriptFileFor, scriptFromEnvironment, stepsOf } from "./scriptedSessionSteps";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function scriptDirectory() {
  const folder = await mkdtemp(join(tmpdir(), "script-"));
  folders.push(folder);
  return folder;
}

const writeScript = (directory: string, cwd: string, content: unknown, purpose?: SessionPurposeKind) => writeFile(scriptFileFor(directory, cwd, purpose), JSON.stringify(content));

describe("scriptFromEnvironment", () => {
  it("ignores the script outside the test environment and when the variable is not set", async () => {
    const directory = await scriptDirectory();
    expect(scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "development" })).toBeNull();
    expect(scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "production" })).toBeNull();
    expect(scriptFromEnvironment({ NODE_ENV: "test" })).toBeNull();
  });

  it("gives each clone its own script, so tests running in parallel never read each other's", async () => {
    const directory = await scriptDirectory();
    await writeScript(directory, "/clone/a", [{ kind: "text", text: "do A" }]);
    await writeScript(directory, "/clone/b", [{ kind: "text", text: "do B" }]);
    const source = scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "test" });
    expect(stepsOf(source!, { sessionId: "s1", cwd: "/clone/a", purpose: "route" })).toEqual([{ kind: "text", text: "do A" }]);
    expect(stepsOf(source!, { sessionId: "s2", cwd: "/clone/b", purpose: "route" })).toEqual([{ kind: "text", text: "do B" }]);
  });

  it("reads the file again for each session, so a test can change its script between sessions", async () => {
    const directory = await scriptDirectory();
    await writeScript(directory, "/clone/a", [{ kind: "text", text: "um" }]);
    const source = scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "test" });
    expect(stepsOf(source!, { sessionId: "s1", cwd: "/clone/a", purpose: "route" })).toEqual([{ kind: "text", text: "um" }]);
    await writeScript(directory, "/clone/a", [{ kind: "text", text: "dois" }]);
    expect(stepsOf(source!, { sessionId: "s2", cwd: "/clone/a", purpose: "route" })).toEqual([{ kind: "text", text: "dois" }]);
  });

  it("V-05i uses separate same-checkout scripts by purpose and resumes the review script after a message", async () => {
    const directory = await scriptDirectory();
    const cwd = "/clone/shared";
    await writeScript(directory, cwd, [{ kind: "text", text: "fallback" }]);
    await writeScript(directory, cwd, [{ kind: "text", text: "review first" }, { kind: "end_turn" }, { kind: "wait_message" }, { kind: "text", text: "review second" }, { kind: "end_turn" }], "review");
    await writeScript(directory, cwd, [{ kind: "text", text: "execute only" }, { kind: "end_turn" }], "review_execute");
    const source = scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "test" })!;
    const output = new Map<string, string[]>();
    const handlersFor = (sessionId: string) => ({ onAssistantText: (text: string) => output.set(sessionId, [...(output.get(sessionId) ?? []), text]), onHook: () => {}, onPermission: async () => ({ behavior: "allow" as const }), onExit: () => {} });
    const runtime = new ScriptedSessionRuntime({ script: source });
    const start = (sessionId: string, purpose: "review" | "review_execute") => runtime.start({ sessionId, cwd, purpose, prompt: "initial", contextDir: "/context", permissionMode: "bypass", handlers: handlersFor(sessionId) });
    start("review-session", "review");
    start("execute-session", "review_execute");
    const review = runtime.runnerOf("review-session");
    const execute = runtime.runnerOf("execute-session");
    await Promise.all([review.settled(), execute.settled()]);
    expect(output.get("review-session")).toEqual(["review first"]);
    expect(output.get("execute-session")).toEqual(["execute only"]);
    review.push("continue review");
    await review.settled();
    expect(output.get("review-session")).toEqual(["review first", "review second"]);
    expect(stepsOf(source, { sessionId: "route-session", cwd, purpose: "route" })).toEqual([{ kind: "text", text: "fallback" }]);
  });
});
