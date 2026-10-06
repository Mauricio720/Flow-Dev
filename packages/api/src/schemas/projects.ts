import { z } from "zod";
import { isProjectCursor, isRepositoryPageCursor } from "../application/pagination/cursor";
import { BOARD_URL_MAX } from "../application/services/projects/projectBoardRules";
import { projectDescriptionSchema, projectNameSchema } from "./projectFields";

const cursor = z.string().max(200).refine(isProjectCursor, "Cursor inválido");
const repositoryCursor = z.string().max(200).refine(isRepositoryPageCursor, "Cursor inválido");
const search = z.string().trim().max(120, "A busca é muito longa");
export const projectIdSchema = z.object({ projectId: z.string().uuid() }).strict();
export const projectListInputSchema = z.object({ search: search.optional(), cursor: cursor.optional() }).strict();
export const createProjectInputSchema = z.object({ name: projectNameSchema, description: projectDescriptionSchema.nullish(), nodeId: z.string().min(1).max(200) }).strict();
export const updateProjectDetailsInputSchema = z.object({ projectId: z.string().uuid(), name: projectNameSchema, description: projectDescriptionSchema.nullable(), expectedVersion: z.number().int().positive() }).strict();
export const updateProjectBoardInputSchema = z.object({ projectId: z.string().uuid(), boardUrl: z.string().trim().min(1).max(BOARD_URL_MAX).nullable() }).strict();
export const repositoryCandidatesInputSchema = z.object({ search: search.optional(), cursor: repositoryCursor.optional() }).strict();
export const repositoryPreviewInputSchema = z.object({ nodeId: z.string().min(1).max(200).optional(), owner: z.string().min(1).max(100).optional(), name: z.string().min(1).max(100).optional() }).strict().refine((value) => !!value.nodeId !== (!!value.owner && !!value.name), "Escolha nodeId ou owner/name").refine((value) => value.nodeId || value.owner && value.name, "Repositório obrigatório");
export const connectionStatesInputSchema = z.object({ projectIds: z.array(z.string().uuid()).min(1).max(50) }).strict();
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectDetailsInput = z.infer<typeof updateProjectDetailsInputSchema>;
