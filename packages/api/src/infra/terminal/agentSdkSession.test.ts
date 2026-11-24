import { describe, expect, it, vi } from "vitest";
import { SessionHandlerFactory } from "../../application/services/terminal/sessionHandlers";
import { AgentSdkSession } from "./agentSdkSession";

const sdk = vi.hoisted(() => ({ messages: [] as unknown[] }));

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: () => ({ async *[Symbol.asyncIterator]() { yield* sdk.messages; }, close: () => undefined, interrupt: async () => undefined }),
}));

const SESSION_ID = "session-1";
const log = { info: () => undefined, error: () => undefined };
const init = (version?: string) => ({ type: "system", subtype: "init", session_id: "claude-session", claude_code_version: version });

async function runSession(messages: unknown[]) {
  sdk.messages = messages;
  const versions: Array<[string, string]> = [];
  const recorder = { text: async () => undefined, hook: async () => undefined };
  const factory = new SessionHandlerFactory({ recorder: recorder as never, permissions: {} as never, onExit: async () => undefined, onAgentVersion: async (id, version) => { versions.push([id, version]); }, log });
  const handlers = factory.handlersFor({ id: SESSION_ID } as never);
  const session = new AgentSdkSession({ sessionId: SESSION_ID, cwd: "/clone", contextDir: "/context", permissionMode: "ask_all", handlers, firstMessage: "oi" }, { locate: async () => "/bin/claude", env: {}, log });
  await session.close();
  await factory.flush();
  return versions;
}

describe("Claude session agent version", () => {
  it("records the Claude Code version once from system/init", async () => {
    await expect(runSession([init("2.1.3"), init("9.9.9")])).resolves.toEqual([[SESSION_ID, "2.1.3"]]);
  });

  it("records nothing when the init message carries no version", async () => {
    await expect(runSession([init()])).resolves.toEqual([]);
  });
});
