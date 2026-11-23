import { z } from "zod";

const scope = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).strict();

export const artifactListInputSchema = scope;
export const artifactGetInputSchema = scope.extend({ artifactId: z.string().uuid(), version: z.number().int().min(1).optional() }).strict();
