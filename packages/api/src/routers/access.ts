import { mapAccessError } from "../controllers/accessController";
import { createProductionAccessController } from "../infra/composition";
import { protectedProcedure, router } from "../trpc";
import { accessListSchema, assignmentSchema, userAssignmentsSchema } from "../schemas/access";

let productionController: ReturnType<typeof createProductionAccessController> | undefined;
const getController = () => productionController ?? (productionController = createProductionAccessController());

export const accessRouter = router({
  me: protectedProcedure.query(({ ctx }) => getController().me(ctx.principal).catch(mapAccessError)),
  users: protectedProcedure.input(accessListSchema).query(({ ctx, input }) => getController().users(ctx.principal, input).catch(mapAccessError)),
  userAssignments: protectedProcedure.input(userAssignmentsSchema).query(({ ctx, input }) => getController().assignments(ctx.principal, input.userId, input.cursor).catch(mapAccessError)),
  assign: protectedProcedure.input(assignmentSchema).mutation(({ ctx, input }) => getController().assign(ctx.principal, input).catch(mapAccessError)),
  remove: protectedProcedure.input(assignmentSchema).mutation(({ ctx, input }) => getController().remove(ctx.principal, input).catch(mapAccessError)),
});
