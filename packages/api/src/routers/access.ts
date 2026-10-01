import { AccessController, mapAccessError } from "../controllers/accessController";
import { AssignmentService } from "../application/services/access/assignmentService";
import { sharedAccessDao } from "../infra/database/dao/accessInMemoryDao";
import { protectedProcedure, router } from "../trpc";
import { accessListSchema, assignmentSchema, userAssignmentsSchema } from "../schemas/access";

const dao = sharedAccessDao;
const controller = new AccessController(new AssignmentService(dao), dao);

export const accessRouter = router({
  me: protectedProcedure.query(({ ctx }) => controller.me(ctx.principal)),
  users: protectedProcedure.input(accessListSchema).query(({ ctx, input }) => controller.users(ctx.principal, input).catch(mapAccessError)),
  userAssignments: protectedProcedure.input(userAssignmentsSchema).query(({ ctx, input }) => controller.assignments(ctx.principal, input.userId, input.cursor).catch(mapAccessError)),
  assign: protectedProcedure.input(assignmentSchema).mutation(({ ctx, input }) => controller.assign(ctx.principal, input).catch(mapAccessError)),
  remove: protectedProcedure.input(assignmentSchema).mutation(({ ctx, input }) => controller.remove(ctx.principal, input).catch(mapAccessError)),
});
