import { initTRPC, TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";
import type { Context } from "./context";
import { ProjectConflictError, projectConflictKind } from "./application/services/projects/projectErrors";

import { RepositoryRateLimitedError } from "./application/github/repositoryErrors";
import { TaskError } from "./application/services/tasks/taskErrors";
import { AssignedIssueError } from "./application/services/assigned-issues/assignedIssueErrors";
import { AgentSettingsError } from "./application/services/projects/agentSettingsErrors";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? z.flattenError(error.cause) : null;
    const existingProjectId = error.cause instanceof ProjectConflictError ? error.cause.existingProjectId : undefined;
    const retryAfterSeconds = error.cause instanceof RepositoryRateLimitedError ? error.cause.retryAfterSeconds : undefined;
    const taskRetryAfterSeconds = error.cause instanceof TaskError ? error.cause.retryAfterSeconds : undefined;
    const conflict = projectConflictKind(error.cause);
    const assignedError = error.cause instanceof AssignedIssueError ? error.cause : undefined;
    const taskReason = error.cause instanceof TaskError ? error.cause.reason : assignedError?.reason ?? (error.cause instanceof AgentSettingsError ? error.cause.reason : undefined) ?? taskInputReason(error.cause);
    const fieldErrors = error.cause instanceof TaskError ? error.cause.fieldErrors : undefined;
    return { ...shape, data: { ...shape.data, zodError, retryAfterSeconds: taskRetryAfterSeconds ?? assignedError?.retryAfterSeconds ?? retryAfterSeconds, ...(taskReason ? { reason: taskReason } : {}), ...(fieldErrors ? { fieldErrors } : {}), ...(existingProjectId ? { existingProjectId } : {}), ...(conflict ? { conflict } : {}) } };
  },
});

function taskInputReason(error: unknown) {
  if (!(error instanceof ZodError)) return undefined;
  const paths = error.issues.map((issue) => issue.path.join("."));
  if (error.issues.some((issue) => issue.code === "unrecognized_keys")) return "invalid_input";
  if (paths.some((path) => path.includes("requestKey"))) return "invalid_request_key";
  if (paths.some((path) => path.includes("projectId") || path.includes("taskId"))) return "invalid_input";
  return undefined;
}

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão necessária", cause: new TaskError("session_required") });
  return next({ ctx: { ...ctx, principal: ctx.principal } });
});
