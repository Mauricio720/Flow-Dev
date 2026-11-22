import { z } from "zod";

const PATH_INPUT_MAX_LENGTH = 4096;

export const localCheckoutSaveInputSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().trim().max(PATH_INPUT_MAX_LENGTH),
  expectedVersion: z.number().int().min(0).optional(),
}).strict();

export type LocalCheckoutSaveInput = z.infer<typeof localCheckoutSaveInputSchema>;
