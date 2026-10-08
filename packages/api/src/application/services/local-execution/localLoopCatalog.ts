import { z } from "zod";
import type { LoopDefinition } from "../../software/compozyControlGateway";

export const LOOP_CATALOG_MAX = 32;
const LOOP_FIELDS_MAX = 32;
const DESCRIPTION_MAX = 512;
const IDENTIFIER = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/);
const UNSAFE_TEXT = /[\u0000-\u001f\u007f]|(?:\/home\/|\/Users\/|[A-Z]:\\Users\\)|(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})/i;
const SAFE_TEXT = z.string().max(DESCRIPTION_MAX).refine((value) => !UNSAFE_TEXT.test(value));

const loopInputSchema = z.object({
  name: IDENTIFIER,
  kind: IDENTIFIER,
  required: z.boolean(),
  hasDefault: z.boolean(),
  enumValues: z.array(SAFE_TEXT).max(LOOP_FIELDS_MAX).nullable(),
  defaultValue: z.union([SAFE_TEXT, z.number().finite(), z.boolean()]).nullable().optional(),
}).strict();

export const localLoopSchema = z.object({
  name: IDENTIFIER,
  version: IDENTIFIER,
  source: IDENTIFIER,
  enabled: z.boolean(),
  description: SAFE_TEXT,
  inputs: z.array(loopInputSchema).max(LOOP_FIELDS_MAX),
  runtimeRoles: z.array(IDENTIFIER).max(LOOP_FIELDS_MAX),
  runtimeLocked: z.boolean(),
  requires: z.array(IDENTIFIER).max(LOOP_FIELDS_MAX),
}).strict();

export const localLoopCatalogSchema = z.array(localLoopSchema).max(LOOP_CATALOG_MAX).refine((catalog) => new Set(catalog.map((loop) => loop.name)).size === catalog.length);

function singleLine(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, DESCRIPTION_MAX);
}

/** Keeps only the definitions the server accepts, so one unusual Loop never fails the whole heartbeat. */
export function publishableLoops(definitions: LoopDefinition[]): LoopDefinition[] {
  const accepted = new Map<string, LoopDefinition>();
  for (const definition of definitions) {
    const parsed = localLoopSchema.safeParse({ ...definition, description: singleLine(definition.description) });
    if (parsed.success && !accepted.has(parsed.data.name)) accepted.set(parsed.data.name, parsed.data);
  }
  return [...accepted.values()].slice(0, LOOP_CATALOG_MAX);
}
