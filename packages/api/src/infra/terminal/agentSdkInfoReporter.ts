import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { initAgentInfo } from "./agentSdkMessages";

export type AgentInfo = { version: string | null };

export class AgentInfoReporter {
  private reported = false;

  constructor(private readonly report: (info: AgentInfo) => void) {}

  observe(message: SDKMessage) {
    const info = this.reported ? null : initAgentInfo(message);
    if (!info) return;
    this.reported = true;
    this.report(info);
  }
}
