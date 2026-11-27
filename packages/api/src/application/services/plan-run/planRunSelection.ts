import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { PlanItemView } from "../tasks-set/planView";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import { emptySessionMessage } from "./planRunCopy";
import { isAgentWorking } from "./planRunWorking";
import { launchFailedMessage, nothingToStartMessage, openTaskNumbers, unfinishedMessage } from "./planRunPauseReasons";

export type PlanRunPauseCode = "session_unfinished" | "session_launch_failed" | "session_empty" | "nothing_to_start" | "launch_refused" | "claim_lost" | "planning_not_approved" | "task_set_unreadable" | "folder_changed";
export type CurrentSession = { itemId: string; status: TerminalSessionStatus; launchError: string | null };
export type SelectionInput = { items: PlanItemView[]; set: TaskSet; working: boolean; current: CurrentSession | null };
export type PlanRunDecision = { kind: "wait" } | { kind: "start"; itemId: string } | { kind: "pause"; code: PlanRunPauseCode; reason: string; itemId: string | null } | { kind: "complete" };

const FIRST_POSITION = 1;
const LAUNCH_FAILED_STATUS: TerminalSessionStatus = "launch_failed";
const WAIT: PlanRunDecision = { kind: "wait" };
const COMPLETE: PlanRunDecision = { kind: "complete" };

function positionOf(items: PlanItemView[], itemId: string) {
  return items.findIndex((item) => item.id === itemId) + FIRST_POSITION;
}

function stoppedCurrent({ items, set, current }: SelectionInput): PlanRunDecision | null {
  if (!current || isAgentWorking(current.status)) return null;
  const item = items.find((candidate) => candidate.id === current.itemId);
  if (!item || item.state === "done") return null;
  const position = positionOf(items, item.id);
  if (current.status === LAUNCH_FAILED_STATUS) return { kind: "pause", code: "session_launch_failed", reason: launchFailedMessage(position, current.launchError), itemId: item.id };
  return { kind: "pause", code: "session_unfinished", reason: unfinishedMessage(position, openTaskNumbers(item, set)), itemId: item.id };
}

function nextCandidate(items: PlanItemView[]): PlanRunDecision | null {
  for (const [index, item] of items.entries()) {
    if (item.started) continue;
    if (item.state === "empty") return { kind: "pause", code: "session_empty", reason: emptySessionMessage(index + FIRST_POSITION), itemId: item.id };
    if (item.state === "ready") return { kind: "start", itemId: item.id };
  }
  return null;
}

export function decidePlanRun(input: SelectionInput): PlanRunDecision {
  if (input.working) return WAIT;
  const stopped = stoppedCurrent(input);
  if (stopped) return stopped;
  const candidate = nextCandidate(input.items);
  if (candidate) return candidate;
  if (input.items.every((item) => item.state === "done")) return COMPLETE;
  return { kind: "pause", code: "nothing_to_start", reason: nothingToStartMessage(input.items, input.set), itemId: null };
}
