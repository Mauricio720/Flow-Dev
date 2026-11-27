import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { PlanRunRecord } from "./planRunDao";

export type PlanRunCurrentSession = { status: TerminalSessionStatus; launchError: string | null };

export interface PlanRunWorkerDao {
  listRunningForHost(hostId: string): Promise<PlanRunRecord[]>;
  agentWorking(taskId: string): Promise<boolean>;
  currentSession(sessionId: string): Promise<PlanRunCurrentSession | null>;
}
