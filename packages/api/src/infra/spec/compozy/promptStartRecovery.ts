import type { RuntimeIdentity, RuntimeSnapshot, SpecRuntimeGateway } from "../../../application/spec/specRuntimeGateway";

const MINUTE_MS = 60_000;
export const PROMPT_START_GRACE_MS = 2 * MINUTE_MS;
export const PROMPT_START_DEADLINE_MS = 6 * MINUTE_MS;
const USER_MESSAGE_EVENT = "user_message";
export const PROMPT_START_FAILURE = "O agente não começou a trabalhar: o CompozyOS não iniciou a sessão nem depois de receber o pedido de novo. Execute a etapa outra vez.";

export type PromptStartCheck = {
  gateway: Pick<SpecRuntimeGateway, "events">;
  identity: RuntimeIdentity;
  snapshot: RuntimeSnapshot;
  now: Date;
  resubmit(): Promise<unknown>;
};

/** The runtime can lose the first prompt before binding the agent; the session then idles until its inactivity stop. */
export async function promptStartVerdict(check: PromptStartCheck): Promise<"waiting" | "stalled"> {
  const age = unboundAge(check.snapshot, check.now);
  if (age === null || age < PROMPT_START_GRACE_MS) return "waiting";
  if (await receivedPrompt(check)) return "waiting";
  if (age >= PROMPT_START_DEADLINE_MS) return "stalled";
  await check.resubmit().catch(() => undefined);
  return "waiting";
}

function unboundAge(snapshot: RuntimeSnapshot, now: Date) {
  const since = snapshot.unboundSince ? Date.parse(snapshot.unboundSince) : Number.NaN;
  return Number.isNaN(since) ? null : now.getTime() - since;
}

async function receivedPrompt(check: PromptStartCheck) {
  try {
    for await (const event of check.gateway.events({ ...check.identity, afterSequence: 0 })) if (event.type === USER_MESSAGE_EVENT) return true;
    return false;
  } catch {
    return true;
  }
}
