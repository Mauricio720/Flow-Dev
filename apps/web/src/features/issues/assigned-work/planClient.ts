import { trpc } from "@/lib/trpc/client";
import type { PlanSaveInput } from "./planContract";
import type { TerminalScope } from "./terminalContract";

export function fetchPlan(scope: TerminalScope) {
  return trpc.tasks.plan.get.query(scope);
}

export function savePlan(scope: TerminalScope, input: Pick<PlanSaveInput, "version" | "items">) {
  return trpc.tasks.plan.save.mutate({ ...scope, ...input });
}
