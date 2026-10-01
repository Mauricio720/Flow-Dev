import { z } from "zod";
export const accessListSchema = z.object({ search: z.string().trim().max(200).optional(), cursor: z.string().max(200).optional() });
export const userAssignmentsSchema = z.object({ userId: z.string().uuid(), cursor: z.string().max(200).optional() });
export const assignmentSchema = z.object({ userId: z.string().uuid(), projectId: z.string().uuid() });
