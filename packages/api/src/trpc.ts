import { initTRPC, TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";
import type { Context } from "./context";
import { ProjectConflictError, projectConflictKind } from "./application/services/projects/projectErrors";

import { RepositoryRateLimitedError } from "./application/github/repositoryErrors";
import { TaskError } from "./application/services/tasks/taskErrors";
import { SoftwareError } from "./application/services/software/softwareErrors";
import { TaskFlowError } from "./application/services/task-flow/taskFlowErrors";
import { AssignedIssueError } from "./application/services/assigned-issues/assignedIssueErrors";
import { LocalExecutionError } from "./application/services/local-execution/localExecutionErrors";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? z.flattenError(error.cause) : null;
    const existingProjectId = error.cause instanceof ProjectConflictError ? error.cause.existingProjectId : undefined;
    const retryAfterSeconds = error.cause instanceof RepositoryRateLimitedError ? error.cause.retryAfterSeconds : undefined;
    const taskRetryAfterSeconds = error.cause instanceof TaskError ? error.cause.retryAfterSeconds : undefined;
    const conflict = projectConflictKind(error.cause);
    const softwareError = error.cause instanceof SoftwareError ? error.cause : undefined;
    const flowError = error.cause instanceof TaskFlowError ? error.cause : undefined;
    const assignedError = error.cause instanceof AssignedIssueError ? error.cause : undefined;
    const localError = error.cause instanceof LocalExecutionError ? error.cause : undefined;
    const taskReason = error.cause instanceof TaskError ? error.cause.reason : softwareError?.reason ?? flowError?.reason ?? assignedError?.reason ?? localError?.reason ?? taskInputReason(error.cause);
    const fieldErrors = error.cause instanceof TaskError ? error.cause.fieldErrors : softwareError?.fieldErrors;
    return { ...shape, data: { ...shape.data, zodError, retryAfterSeconds: taskRetryAfterSeconds ?? assignedError?.retryAfterSeconds ?? retryAfterSeconds, ...(taskReason ? { reason: taskReason } : {}), ...(fieldErrors ? { fieldErrors } : {}), ...(softwareError?.current ?? flowError?.current ? { current: softwareError?.current ?? flowError?.current } : {}), ...(flowError?.details ? { details: flowError.details } : {}), ...(existingProjectId ? { existingProjectId } : {}), ...(conflict ? { conflict } : {}) } };
  },
});

const SPEC_REASON_MARKER = "spec:";

function taskInputReason(error: unknown) {
  if (!(error instanceof ZodError)) return undefined;
  const paths = error.issues.map((issue) => issue.path.join("."));
  const marked = error.issues.find((issue) => issue.message.startsWith(SPEC_REASON_MARKER));
  if (marked) return marked.message.slice(SPEC_REASON_MARKER.length);
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
