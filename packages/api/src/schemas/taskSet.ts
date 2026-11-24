import { z } from "zod";

export const taskSetGetInputSchema = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();
