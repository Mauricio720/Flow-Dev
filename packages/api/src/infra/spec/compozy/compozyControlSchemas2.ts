import { z } from "zod";

const worktreeRow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.string().min(1),
  workspace_id: z.string().min(1),
  path: z.string().nullish(),
  dirty: z.boolean().nullish(),
  branch: z.string().nullish(),
});

export const worktreeListSchema = z.object({ worktrees: z.array(worktreeRow) });
export const worktreeCreatedSchema = z.object({ worktree: worktreeRow });
export const worktreeInspectSchema = z.object({
  worktree: worktreeRow,
  status: z.object({ dirty_files: z.number().nullish() }).nullish(),
});

const loopInput = z.object({
  type: z.string().min(1),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
});

const loopSummary = z.object({
  name: z.string().min(1),
  version: z.number().int(),
  source: z.string().min(1),
  description: z.string().default(""),
});

export const loopListSchema = z.object({ loops: z.array(loopSummary), page: z.object({ has_more: z.boolean(), next_cursor: z.string().optional() }).optional() });

export const loopInspectSchema = z.object({
  loop: loopSummary.extend({ definition: z.object({ inputs: z.record(z.string(), loopInput).default({}) }) }),
});

const loopRun = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  definition_version: z.number().int().nullish(),
  created_at: z.string(),
  inputs: z.record(z.string(), z.unknown()).nullish(),
});

export const loopRunSchema = z.object({ run: loopRun });
export const loopRunListSchema = z.object({ runs: z.array(loopRun) });
export const loopCancelSchema = z.object({ ok: z.boolean(), run_id: z.string().min(1) });

export type WorktreeRow = z.infer<typeof worktreeRow>;
export type LoopRunRow = z.infer<typeof loopRun>;
export type LoopInputRow = z.infer<typeof loopInput>;
