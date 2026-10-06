import { z } from "zod";

export const PROJECT_NAME_MIN = 2;
export const PROJECT_NAME_MAX = 60;
export const PROJECT_DESCRIPTION_MAX = 280;
const NAME_MESSAGE = `Use de ${PROJECT_NAME_MIN} a ${PROJECT_NAME_MAX} caracteres no nome`;
const DESCRIPTION_MESSAGE = `Use até ${PROJECT_DESCRIPTION_MAX} caracteres na descrição`;

export const projectNameSchema = z.string().trim().min(PROJECT_NAME_MIN, NAME_MESSAGE).max(PROJECT_NAME_MAX, NAME_MESSAGE);
export const projectDescriptionSchema = z.string().trim().max(PROJECT_DESCRIPTION_MAX, DESCRIPTION_MESSAGE);
export const projectDetailsSchema = z.object({ name: projectNameSchema, description: projectDescriptionSchema });
