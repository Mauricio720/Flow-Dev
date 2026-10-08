import { trpc } from "@/lib/trpc/client";
import type { PendingCommand } from "./planningCommandState";

type Scope = { projectId: string };

export function dispatchPlanning(scope: Scope, command: PendingCommand) {
  const base = { projectId: scope.projectId, taskId: command.taskId, requestKey: command.requestKey, expectedVersion: command.expectedVersion };
  if (command.action === "planning.start") return trpc.tasks.planning.start.mutate(base);
  if (command.action === "planning.retry") return trpc.tasks.planning.retry.mutate({ ...base, failedOperationId: command.failedOperationId });
  const review = { ...base, decisionId: command.decisionId, expectedDecisionVersion: command.expectedDecisionVersion };
  if (command.action === "planning.selectRoute") return trpc.tasks.planning.selectRoute.mutate({ ...review, selectedRoute: command.route });
  return trpc.tasks.planning.approve.mutate({ ...review, reviewedRoute: command.route });
}

export function observePlanningSubmission(scope: Scope, command: PendingCommand) {
  return trpc.tasks.planning.submission.query({ projectId: scope.projectId, taskId: command.taskId, action: command.action, requestKey: command.requestKey });
}
