import { z } from "zod";
import { isValidCursor } from "../application/pagination/cursor";
const cursorSchema = z.string().max(200).refine(isValidCursor, "Cursor inválido");
export const accessListSchema = z.object({ search: z.string().trim().max(200).optional(), cursor: cursorSchema.optional() });
export const userAssignmentsSchema = z.object({ userId: z.string().uuid(), cursor: cursorSchema.optional() });
export const assignmentSchema = z.object({ userId: z.string().uuid(), projectId: z.string().uuid() });
