import { codexAssistantText } from "../../../application/services/terminal/codex/codexItemTranslator";
import { codexHookEvents } from "../../../application/services/terminal/codex/codexHookTranslator";
import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import type { ThreadNotification } from "./protocol/codexMethods";
import type { CodexTurnQueue } from "./codexTurnQueue";
import { codexUsageLimitOf, type CodexUsageLimitFailure } from "./codexTurnFailure";

export function emitCodexNotification({ input, method, params, threadId, announce }: { input: RuntimeStartInput; method: string; params: ThreadNotification; threadId: string; announce: (id: string) => void }) {
  const id = params.threadId ?? params.thread?.id;
  if (method === "thread/started" && id) { announce(id); return; }
  if (id !== threadId) return;
  const text = params.item ? codexAssistantText({ threadId: id, mainThreadId: threadId, item: params.item, completed: method === "item/completed" }) : null;
  if (text) input.handlers.onAssistantText(text);
  for (const hook of codexHookEvents({ method, params }, threadId)) input.handlers.onHook(hook);
}

export function handleCodexNotification({ input, method, params, threadId, turns, sendTurn, onUsageLimit }: { input: RuntimeStartInput; method: string; params: ThreadNotification; threadId: string; turns: CodexTurnQueue; sendTurn: (prompt: string) => void; onUsageLimit?: (failure: CodexUsageLimitFailure) => void }) {
  if ((params.threadId ?? params.thread?.id) !== threadId) return;
  const usageLimit = codexUsageLimitOf(method, params);
  if (usageLimit) { onUsageLimit?.(usageLimit); return; }
  emitCodexNotification({ input, method, params, threadId, announce: () => undefined });
  if (method === "turn/completed") { const next = turns.complete(); if (next) sendTurn(next); }
}
