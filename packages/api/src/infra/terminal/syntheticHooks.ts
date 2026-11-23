import type { HookPayload } from "../../application/terminal/claudeSessionRuntime";

export type SessionStartSource = "startup" | "resume";

const SESSION_END_REASON = "other";

export function sessionStartHook(input: { claudeSessionId: string; cwd: string; source: SessionStartSource }): HookPayload {
  return { hook_event_name: "SessionStart", session_id: input.claudeSessionId, cwd: input.cwd, source: input.source };
}

export function sessionEndHook(claudeSessionId: string): HookPayload {
  return { hook_event_name: "SessionEnd", session_id: claudeSessionId, reason: SESSION_END_REASON };
}

export function sessionHook(session: { claudeSessionId: string; cwd: string }, fields: Record<string, unknown>): HookPayload {
  return { ...fields, session_id: session.claudeSessionId, cwd: session.cwd };
}
