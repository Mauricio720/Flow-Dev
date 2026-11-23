import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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

const writeScript = (directory: string, cwd: string, content: unknown) => writeFile(scriptFileFor(directory, cwd), JSON.stringify(content));

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
    expect(stepsOf(source!, { sessionId: "s1", cwd: "/clone/a" })).toEqual([{ kind: "text", text: "do A" }]);
    expect(stepsOf(source!, { sessionId: "s2", cwd: "/clone/b" })).toEqual([{ kind: "text", text: "do B" }]);
  });

  it("reads the file again for each session, so a test can change its script between sessions", async () => {
    const directory = await scriptDirectory();
    await writeScript(directory, "/clone/a", [{ kind: "text", text: "um" }]);
    const source = scriptFromEnvironment({ FLOW_DEV_SESSION_FAKE_SCRIPT: directory, NODE_ENV: "test" });
    expect(stepsOf(source!, { sessionId: "s1", cwd: "/clone/a" })).toEqual([{ kind: "text", text: "um" }]);
    await writeScript(directory, "/clone/a", [{ kind: "text", text: "dois" }]);
    expect(stepsOf(source!, { sessionId: "s2", cwd: "/clone/a" })).toEqual([{ kind: "text", text: "dois" }]);
  });
});
