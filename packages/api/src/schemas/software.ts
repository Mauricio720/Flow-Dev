import { z } from "zod";
import { isValidCursor } from "../application/pagination/cursor";
import { DOCS_PROXY_MAX_LENGTH } from "../application/services/software/settingsRules";
import { LABEL_MAX_LENGTH } from "../application/services/software/connectionRules";

export const SOFTWARE_DEFAULT_PAGE_SIZE = 20;
export const SOFTWARE_MAX_PAGE_SIZE = 50;
const LABEL_INPUT_MAX_LENGTH = LABEL_MAX_LENGTH * 4;
const SEARCH_MAX_LENGTH = 100;

const cursor = z.string().max(200).refine(isValidCursor, "Cursor inválido");
const limit = z.number().int().min(1).max(SOFTWARE_MAX_PAGE_SIZE).default(SOFTWARE_DEFAULT_PAGE_SIZE);
const revision = z.number().int().min(0);
const docsProxyUrl = z.string().trim().max(DOCS_PROXY_MAX_LENGTH).nullish().transform((value) => value || null);

export const softwareSettingsValuesSchema = z.object({
  enabled: z.boolean(),
  docsProxyUrl,
  maxActiveActions: z.number().finite(),
}).strict();

export const saveSettingsSchema = z.object({
  values: softwareSettingsValuesSchema,
  expectedRevision: revision,
  idempotencyKey: z.string().uuid(),
}).strict();

export const pageSchema = z.object({ cursor: cursor.optional(), limit: limit.optional() }).strict();
export const connectionsSchema = pageSchema.extend({ search: z.string().trim().max(SEARCH_MAX_LENGTH).optional() }).strict();

export const beginLoginSchema = z.object({
  connectionId: z.string().uuid().optional(),
  label: z.string().max(LABEL_INPUT_MAX_LENGTH).optional(),
  idempotencyKey: z.string().uuid(),
}).strict();

export const pollLoginSchema = z.object({ operationId: z.string().uuid() }).strict();
export const confirmAccountSchema = z.object({ operationId: z.string().uuid(), expectedConnectionRevision: revision }).strict();

export const disconnectSchema = z.object({
  connectionId: z.string().uuid(),
  expectedRevision: revision,
  idempotencyKey: z.string().uuid(),
}).strict();

export const renameSchema = z.object({
  connectionId: z.string().uuid(),
  label: z.string().max(LABEL_INPUT_MAX_LENGTH),
  expectedRevision: revision,
}).strict();
