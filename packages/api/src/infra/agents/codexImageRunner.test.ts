import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentImage } from "../../application/agents/agentImages";
import { FAKE_CLI } from "../../../test/fixtures/agents/fakeCliPath";
import type { AgentRun } from "../../application/agents/localAgentRunner";
import { CodexRunner } from "./codexRunner";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const JPEG = new Uint8Array([255, 216, 255, 0, 4, 5]);
const images: AgentImage[] = [
  { id: "png-id", contentType: "image/png", content: PNG, origin: { kind: "message", messageNumber: 1 } },
  { id: "jpeg-id", contentType: "image/jpeg", content: JPEG, origin: { kind: "draft", caption: "print" } },
];
let home = "";
beforeAll(() => { home = mkdtempSync(join(tmpdir(), "codex-image-home-")); mkdirSync(join(home, ".codex")); writeFileSync(join(home, ".codex", "auth.json"), "{}"); });
afterAll(() => rmSync(home, { recursive: true, force: true }));

function request(scenario: object, selected: AgentImage[] = []): AgentRun {
  return { choice: { provider: "codex", model: "gpt-6.1-sol", effort: "medium" }, instructions: "Be brief.", prompt: JSON.stringify(scenario), images: selected, outputSchema: { $schema: "x", type: "object" }, context: { url: "http://127.0.0.1:1/mcp/e", capability: "k".repeat(40) }, timeoutMs: 10000, signal: new AbortController().signal };
}

const runner = () => new CodexRunner({ bin: FAKE_CLI, env: { PATH: process.env.PATH, HOME: home } });

describe("Codex image runner", () => {
  it("V-05a and V-05b writes original bytes and places --image values after exec", async () => {
    const { output } = await runner().run(request({ mode: "dump" }, images));
    const dump = output as { args: string[]; cwd: string; executionFiles: string[]; imageFiles: Array<{ path: string; data: string }> };
    const firstPath = dump.args[2]!;
    const secondPath = dump.args[4]!;
    expect(dump.args.slice(0, 6)).toEqual(["exec", "--image", firstPath, "--image", secondPath, "--ephemeral"]);
    expect(firstPath).toMatch(/\/images\/1\.png$/);
    expect(secondPath).toMatch(/\/images\/2\.jpg$/);
    expect(dump.args.at(-1)).toBe("-");
    expect(dump.args.slice(0, dump.args.indexOf("--disable"))).toEqual(["exec", "--image", firstPath, "--image", secondPath, "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "-C", expect.any(String), "-s", "read-only", "--output-schema", expect.any(String), "--json", "-m", "gpt-6.1-sol", "-c", "model_reasoning_effort=medium", "-c", "mcp_servers.flow.url=\"http://127.0.0.1:1/mcp/e\"", "-c", "mcp_servers.flow.bearer_token_env_var=FLOW_CONTEXT_TOKEN", "-c", "mcp_servers.flow.default_tools_approval_mode=approve", "-c", 'web_search="disabled"']);
    expect(dump.args.slice(dump.args.indexOf("--disable"), dump.args.indexOf("--disable") + 2)).toEqual(["--disable", "shell_tool"]);
    expect(dump.args).toContain("view_image");
    expect(dump.args[dump.args.indexOf("view_image") - 1]).toBe("--disable");
    expect(dump.imageFiles.map(({ data }) => data)).toEqual([Buffer.from(PNG).toString("base64"), Buffer.from(JPEG).toString("base64")]);
    expect(dump.executionFiles).toContain("images");
    expect(existsSync(dump.cwd)).toBe(false);
    expect(dump.imageFiles.map(({ path }) => existsSync(path))).toEqual([false, false]);
  });

  it("V-05c removes the private image directory after success and failure", async () => {
    const success = await runner().run(request({ mode: "dump" }, images));
    expect(existsSync((success.output as { cwd: string }).cwd)).toBe(false);
    const temporary = mkdtempSync(join(tmpdir(), "codex-failure-record-"));
    const cwdFile = join(temporary, "cwd.json");
    await expect(runner().run(request({ mode: "fail", cwdFile, exitCode: 3 }, images))).rejects.toMatchObject({ failure: "provider_failed" });
    const record = JSON.parse(readFileSync(cwdFile, "utf8")) as { cwd: string; imagePaths: string[] };
    expect(existsSync(record.cwd)).toBe(false);
    expect(record.imagePaths.map((path) => existsSync(path))).toEqual([false, false]);
    rmSync(temporary, { recursive: true, force: true });
  });

  it("V-06b keeps the no-image arguments and creates no images directory", async () => {
    const { output } = await runner().run(request({ mode: "dump" }));
    const dump = output as { args: string[]; executionFiles: string[]; imageFiles: unknown[] };
    expect(dump.args).not.toContain("--image");
    expect(dump.args.at(-1)).toBe("-");
    expect(dump.executionFiles).not.toContain("images");
    expect(dump.imageFiles).toEqual([]);
  });
});
