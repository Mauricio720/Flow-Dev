import { trpc } from "@/lib/trpc/client";
import type { TerminalScope } from "./terminalContract";

export function startPlanRun(scope: TerminalScope, requestKey: string) {
  return trpc.tasks.plan.run.start.mutate({ ...scope, requestKey });
}

export function pausePlanRun(scope: TerminalScope, revision: number) {
  return trpc.tasks.plan.run.pause.mutate({ ...scope, revision });
}

export function resumePlanRun(scope: TerminalScope, revision: number) {
  return trpc.tasks.plan.run.resume.mutate({ ...scope, revision });
}
