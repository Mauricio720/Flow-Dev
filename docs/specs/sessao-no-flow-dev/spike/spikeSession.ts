import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, Query, SDKAssistantMessage, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Log } from "./spikeLog";
import { sleep } from "./paths";
import { InputQueue } from "./spikeInput";

export function assistantText(message: SDKAssistantMessage): string {
  return message.message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
}

export function toolUses(message: SDKAssistantMessage) {
  return message.message.content.flatMap((block) => (block.type === "tool_use" ? [block] : []));
}

export class Session {
  readonly input = new InputQueue();
  readonly messages: SDKMessage[] = [];
  readonly query: Query;
  readonly finished: Promise<unknown>;
  sessionId: string | null = null;

  constructor(options: Options, private readonly log: Log) {
    this.query = query({ prompt: this.input, options });
    this.finished = this.consume().catch((error) => this.log.line(`STREAM-ERROR ${error instanceof Error ? error.message : String(error)}`));
  }

  say(text: string) {
    this.log.line(`SAY ${JSON.stringify(text)}`);
    this.input.push(text);
  }

  async waitFor(predicate: (message: SDKMessage) => boolean, timeoutMs: number, from = 0): Promise<SDKMessage | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = this.messages.slice(from).find(predicate);
      if (found) return found;
      await sleep(100);
    }
    return null;
  }

  async turn(text: string, timeoutMs = 120_000) {
    const from = this.messages.length;
    this.say(text);
    const result = await this.waitFor((message) => message.type === "result", timeoutMs, from);
    const replies = this.messages.slice(from).flatMap((message) => (message.type === "assistant" && !message.parent_tool_use_id ? [assistantText(message)] : []));
    return { result, text: replies.join("\n") };
  }

  async close() {
    this.input.close();
    await Promise.race([this.finished, sleep(10_000)]);
  }

  private async consume() {
    for await (const message of this.query) {
      this.messages.push(message);
      this.describe(message);
    }
    this.log.line("STREAM-END");
  }

  private describe(message: SDKMessage) {
    if (message.type === "system" && message.subtype === "init") {
      this.sessionId = message.session_id;
      const { apiKeySource, claude_code_version, permissionMode, skills, plugins, slash_commands } = message;
      this.log.json("INIT", { session_id: message.session_id, apiKeySource, claude_code_version, permissionMode, skills, plugins, slash_commands: slash_commands.length });
    } else if (message.type === "assistant") {
      const uses = toolUses(message).map((use) => ({ name: use.name, input: use.input }));
      this.log.json("ASSISTANT", { parent: message.parent_tool_use_id, text: assistantText(message), tools: uses });
    } else if (message.type === "result") {
      this.log.json("RESULT", { subtype: message.subtype, is_error: message.is_error });
    } else {
      this.log.line(`MSG ${message.type}${"subtype" in message ? `/${String(message.subtype)}` : ""}`);
    }
  }
}

export { InputQueue };
