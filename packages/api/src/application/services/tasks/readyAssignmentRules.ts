import type { BoardStatus } from "../../github/projectBoardGateway";

export type ReadyRefusal = "ready_board_missing" | "ready_status_missing" | "assign_permission_denied";
export type ReadyFacts = { hasBoard: boolean; statuses: BoardStatus[]; canWriteContents: boolean };

export function readyRefusal(facts: ReadyFacts): ReadyRefusal | null {
  if (!facts.hasBoard) return "ready_board_missing";
  if (!facts.statuses.includes("ready")) return "ready_status_missing";
  if (!facts.canWriteContents) return "assign_permission_denied";
  return null;
}
