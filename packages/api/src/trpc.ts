import { initTRPC, TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? z.flattenError(error.cause) : null;
    return { ...shape, data: { ...shape.data, zodError } };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão necessária" });
  return next({ ctx: { ...ctx, principal: ctx.principal } });
});
