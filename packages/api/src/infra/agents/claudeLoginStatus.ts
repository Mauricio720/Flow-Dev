import type { LoginInspection } from "../../application/agent-accounts/agentLoginInspector";

type ClaudeAuthStatus = { loggedIn?: boolean; authMethod?: string; email?: string | null; subscriptionType?: string | null };

export function parseClaudeLoginStatus(output: string): LoginInspection {
  try {
    const result = JSON.parse(output) as ClaudeAuthStatus;
    if (!result.loggedIn || result.authMethod !== "claude.ai") return { status: "logged_out", identity: null, plan: null, detail: null };
    return { status: "logged_in", identity: result.email ?? null, plan: result.subscriptionType ?? null, detail: null };
  } catch {
    return { status: "check_failed", identity: null, plan: null, detail: "invalid_status_output" };
  }
}
