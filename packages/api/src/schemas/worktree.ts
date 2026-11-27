import { z } from "zod";
import { WORKTREE_MODES } from "../application/worktrees/worktreeChoice";

export const worktreeChooseInputSchema = z.object({ projectId: z.string().uuid(), taskId: z.string().uuid(), mode: z.enum(WORKTREE_MODES) }).strict();
