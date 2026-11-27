import type { AgentAccountProvider } from "./agentAccountTypes";

export type LoginInspection = { status: "logged_in" | "logged_out" | "check_failed"; identity: string | null; plan: string | null; detail: string | null };

export interface AgentLoginInspector {
  inspect(input: { provider: AgentAccountProvider; home: string }): Promise<LoginInspection>;
}
