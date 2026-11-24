import type { RuntimeChoice, RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { codexPromptHooks } from "../../../application/services/terminal/codex/codexSkillActivity";
import { codexTurnInput } from "../../../application/services/terminal/codex/codexTurnInput";
import { codexThreadOptions } from "./codexThreadOptions";
import { codexInputAttachments } from "./codexInputAttachments";
import type { InitializeRequest, ThreadStartRequest, TurnStartRequest } from "./protocol/codexMethods";

export const CODEX_INITIALIZE_REQUEST: InitializeRequest = { clientInfo: { name: "flow-dev", title: null, version: "1" }, capabilities: { experimentalApi: true, requestAttestation: false } };

export type SessionOpen = Pick<RuntimeStartInput, "cwd" | "contextDir" | "permissionMode" | "prompt"> & RuntimeChoice;
export type StartRequests = { initialize: InitializeRequest; extraRoots: { extraRoots: string[] }; thread: ThreadStartRequest; turn(threadId: string): TurnStartRequest };

export function codexStartRequests(input: SessionOpen, requestUserInput?: boolean): StartRequests {
  const options = codexThreadOptions({ cwd: input.cwd, choice: input, permissionMode: input.permissionMode, requestUserInput });
  const translated = codexTurnInput({ prompt: input.prompt, contextDir: input.contextDir });
  return {
    initialize: CODEX_INITIALIZE_REQUEST,
    extraRoots: { extraRoots: [`${input.contextDir}/skills`] },
    thread: options.start,
    turn: (threadId) => ({ ...options.turn, threadId, input: codexInputAttachments(translated.input) }),
  };
}

export function startPromptHooks(threadId: string, input: SessionOpen, source: "startup" | "resume" = "startup") {
  return [{ hook_event_name: "SessionStart", session_id: threadId, source }, ...promptHooks(threadId, input)];
}

export function promptHooks(threadId: string, input: SessionOpen) {
  const translated = codexTurnInput({ prompt: input.prompt, contextDir: input.contextDir });
  const skill = translated.input.find((part) => part.type === "skill");
  return codexPromptHooks({ threadId, text: translated.displayText, skill: skill?.type === "skill" ? { threadId, name: skill.name, path: skill.path, contextSkillsPath: `${input.contextDir}/skills` } : undefined });
}

