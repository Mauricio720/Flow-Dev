import { describe, expect, it } from "vitest";
import type { AgentImage, OmittedImage } from "../../application/agents/agentImages";
import { executeLocalAgent, type AgentExecution, type AgentExecutionDeps } from "./agentExecution";

const images: AgentImage[] = [
  { id: "private-image-a", contentType: "image/png", content: new Uint8Array([1, 2, 3]), origin: { kind: "message", messageNumber: 1 } },
  { id: "private-image-b", contentType: "image/gif", content: new Uint8Array([4, 5, 6]), origin: { kind: "draft", caption: "print" } },
];
const omittedImages: OmittedImage[] = [{ id: "private-omitted", origin: { kind: "message", messageNumber: 2 }, reason: "limit" }];

function setup(fail = false) {
  const logs: string[] = [];
  const received: AgentImage[][] = [];
  const deps = {
    settings: { resolve: async () => ({ choice: { provider: "claude", model: "sonnet", effort: "low" }, available: true }) },
    runner: { run: async (input: { images: AgentImage[] }) => { received.push(input.images); if (fail) throw new Error("provider failed"); return { output: { status: "ok" }, durationMs: 9, exitCode: 0 }; } },
    endpoint: { urlFor: () => "http://localhost/context" },
    contextDao: { execution: async () => ({ projectId: "project" }), listCalls: async () => [] },
    log: (line: string) => logs.push(line),
  } as unknown as AgentExecutionDeps;
  const execution: AgentExecution<{ status: string }> = { agent: "issue_author", operationId: "operation", executionId: "execution", capability: "capability", instructions: "instructions", prompt: "prompt", images, omittedImages, outputSchema: {}, timeoutMs: 1000, signal: new AbortController().signal, settingsInvalid: "agent_settings_invalid", parse: () => ({ status: "ok" }), toError: (error) => error };
  return { deps, execution, logs, received };
}

describe("executeLocalAgent image logging", () => {
  it("V-08c forwards images and logs counts without image ids or bytes on success", async () => {
    const { deps, execution, logs, received } = setup();
    await executeLocalAgent(deps, execution);
    expect(received).toEqual([images]);
    expect(logs[0]).toContain('"images":2,"omittedImages":1');
    expect(logs[0]).not.toContain("private-image");
    expect(logs[0]).not.toContain("private-omitted");
    expect(logs[0]).not.toContain("AQID");
  });

  it("V-08c logs the same image counts when the provider fails", async () => {
    const { deps, execution, logs } = setup(true);
    await expect(executeLocalAgent(deps, execution)).rejects.toThrow("provider failed");
    expect(logs[0]).toContain('"images":2,"omittedImages":1');
    expect(logs[0]).not.toContain("private-image");
    expect(logs[0]).not.toContain("private-omitted");
  });
});
