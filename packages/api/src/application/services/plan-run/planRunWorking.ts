import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export const AGENT_WORKING_STATUSES: readonly TerminalSessionStatus[] = ["opening", "unconfirmed", "running", "asking"];

const WORKING = new Set<TerminalSessionStatus>(AGENT_WORKING_STATUSES);

export function isAgentWorking(status: TerminalSessionStatus) {
  return WORKING.has(status);
}
