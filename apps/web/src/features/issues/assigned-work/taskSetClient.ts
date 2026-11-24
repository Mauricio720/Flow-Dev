import { trpc } from "@/lib/trpc/client";
import type { TerminalScope } from "./terminalContract";

export function fetchTaskSet(scope: TerminalScope) {
  return trpc.tasks.taskSet.get.query(scope);
}
