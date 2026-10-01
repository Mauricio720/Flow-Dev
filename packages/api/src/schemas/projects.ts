import { z } from "zod";

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(60),
  description: z.string().trim().max(280).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export const projectIdSchema = z.object({ projectId: z.string().uuid() });
export const projectListInputSchema = z.object({ search: z.string().trim().max(200).optional(), cursor: z.string().max(200).optional() });
