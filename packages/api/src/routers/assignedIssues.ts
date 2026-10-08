import type { AssignedIssuesController } from "../controllers/assignedIssuesController";
import { mapAssignedIssueError } from "../controllers/assignedIssueErrorMapper";
import { assignedIssueActiveSchema, assignedIssueClaimSchema, assignedIssueLookupSchema, assignedIssueReconcileSchema, assignedIssueScopeSchema, assignedIssuesListSchema } from "../schemas/assignedIssues";
import { protectedProcedure, router } from "../trpc";

export function createAssignedIssuesRouter(controller?: AssignedIssuesController) {
  let production: AssignedIssuesController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/assignedIssuesComposition")).createProductionAssignedIssuesController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapAssignedIssueError);
  return router({
    list: protectedProcedure.input(assignedIssuesListSchema).query(({ ctx, input }) => call(async () => (await get()).list(ctx.principal, input))),
    byIssue: protectedProcedure.input(assignedIssueLookupSchema).query(({ ctx, input }) => call(async () => (await get()).byIssue(ctx.principal, input))),
    claim: protectedProcedure.input(assignedIssueClaimSchema).mutation(({ ctx, input }) => call(async () => (await get()).claim(ctx.principal, input))),
    claimStatus: protectedProcedure.input(assignedIssueScopeSchema).query(({ ctx, input }) => call(async () => (await get()).claimStatus(ctx.principal, input))),
    reconcileClaim: protectedProcedure.input(assignedIssueReconcileSchema).mutation(({ ctx, input }) => call(async () => (await get()).reconcileClaim(ctx.principal, input))),
    active: protectedProcedure.input(assignedIssueActiveSchema).query(({ ctx, input }) => call(async () => (await get()).active(ctx.principal, input))),
    byTask: protectedProcedure.input(assignedIssueScopeSchema).query(({ ctx, input }) => call(async () => (await get()).byTask(ctx.principal, input))),
  });
}

export const assignedIssuesRouter = createAssignedIssuesRouter();
