import { describe, expect, it } from "vitest";
import type { AgentImage } from "../../application/agents/agentImages";
import { FAKE_CLI } from "../../../test/fixtures/agents/fakeCliPath";
import type { AgentRun } from "../../application/agents/localAgentRunner";
import { ClaudeCodeRunner } from "./claudeCodeRunner";

const CAPABILITY = "c".repeat(40);
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 9, 0, 255]);
const GIF = new Uint8Array([71, 73, 70, 56, 57, 97]);
const images: AgentImage[] = [
  { id: "png-id", contentType: "image/png", content: PNG, origin: { kind: "message", messageNumber: 1 } },
  { id: "gif-id", contentType: "image/gif", content: GIF, origin: { kind: "draft", caption: "print" } },
];
const runner = new ClaudeCodeRunner({ bin: FAKE_CLI, env: { PATH: process.env.PATH, HOME: "/home/test" } });

function request(scenario: object, selected: AgentImage[] = []): AgentRun {
  return { choice: { provider: "claude", model: "sonnet", effort: "low" }, instructions: "Be brief.", prompt: JSON.stringify(scenario), images: selected, outputSchema: { $schema: "x", type: "object" }, context: { url: "http://127.0.0.1:1/mcp/e", capability: CAPABILITY }, timeoutMs: 10000, signal: new AbortController().signal };
}

describe("Claude image runner", () => {
  it("V-04a replaces only the JSON output options when images are present", async () => {
    const { output } = await runner.run(request({ mode: "dump" }, images));
    const { args } = output as { args: string[] };
    expect(args).toEqual(["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--json-schema", JSON.stringify({ type: "object" }), "--tools", "", "--strict-mcp-config", "--mcp-config", expect.stringContaining("mcp.json"), "--allowedTools", "mcp__flow__*", "--setting-sources", "", "--no-session-persistence", "--system-prompt", "Be brief.", "--model", "sonnet", "--effort", "low"]);
  });

  it("V-04b sends prompt and original image bytes in one stream-json input line", async () => {
    const prompt = JSON.stringify({ mode: "dump" });
    const { output } = await runner.run(request({ mode: "dump" }, images));
    const dump = output as { stdin: string; streamImages: Array<{ media_type: string; data: string }> };
    const stdin = JSON.parse(dump.stdin) as { type: string; message: { role: string; content: Array<Record<string, unknown>> } };
    expect(dump.stdin.trim().split("\n")).toHaveLength(1);
    expect(stdin).toMatchObject({ type: "user", message: { role: "user" } });
    expect(stdin.message.content).toEqual([
      { type: "text", text: prompt },
      { type: "image", source: { type: "base64", media_type: "image/png", data: Buffer.from(PNG).toString("base64") } },
      { type: "image", source: { type: "base64", media_type: "image/gif", data: Buffer.from(GIF).toString("base64") } },
    ]);
    expect(dump.streamImages.map(({ media_type }) => media_type)).toEqual(["image/png", "image/gif"]);
  });

  it("V-04c uses structured_output from the last result event", async () => {
    const stdout = `${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "result", structured_output: { result: "old" } })}\n${JSON.stringify({ type: "assistant" })}\n${JSON.stringify({ type: "result", structured_output: { result: "latest" } })}`;
    const { output } = await runner.run(request({ mode: "raw", stdout }, images));
    expect(output).toEqual({ result: "latest" });
  });

  it("V-04d rejects missing result events and preserves provider failure classification", async () => {
    await expect(runner.run(request({ mode: "raw", stdout: `${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "assistant" })}` }, images))).rejects.toMatchObject({ failure: "invalid_output", detail: "no_structured_output" });
    await expect(runner.run(request({ mode: "raw", stdout: JSON.stringify({ type: "result", is_error: true, result: "provider rejected image" }) }, images))).rejects.toMatchObject({ failure: "provider_failed" });
  });

  it("V-06a keeps Claude arguments and stdin unchanged without images", async () => {
    const prompt = JSON.stringify({ mode: "dump" });
    const { output } = await runner.run(request({ mode: "dump" }));
    const dump = output as { args: string[]; stdin: string };
    expect(dump.args.slice(0, 4)).toEqual(["-p", "--output-format", "json", "--json-schema"]);
    expect(dump.stdin).toBe(prompt);
  });
});
