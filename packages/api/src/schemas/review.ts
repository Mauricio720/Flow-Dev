import { z } from "zod";
import { agentChoiceSchema } from "./plan";

const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();

export const reviewGetInputSchema = scope;
export const reviewStartInputSchema = scope.extend({
  requestKey: z.string().uuid(),
  reviewer: agentChoiceSchema,
  executor: agentChoiceSchema,
  partial: z.boolean(),
  allowOpenSessions: z.boolean(),
}).strict();
export const reviewRequestInputSchema = scope.extend({
  cycleId: z.string().uuid(),
  revision: z.number().int().min(1),
  action: z.enum(["stop", "retry", "accept", "fix"]),
}).strict();
