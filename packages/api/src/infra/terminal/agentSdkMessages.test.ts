import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { initAgentInfo } from "./agentSdkMessages";

describe("Claude init metadata", () => {
  it("exposes the CLI version from system/init, a null version when absent, and nothing for other messages", () => {
    const init = { type: "system", subtype: "init", session_id: "session", claude_code_version: "2.1.3" } as SDKMessage;
    const other = { type: "assistant", message: { content: [] } } as unknown as SDKMessage;
    expect(initAgentInfo(init)).toEqual({ version: "2.1.3" });
    expect(initAgentInfo(other)).toBeNull();
    expect(initAgentInfo({ type: "system", subtype: "init", session_id: "s" } as SDKMessage)).toEqual({ version: null });
  });
});
