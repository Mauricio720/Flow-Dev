import type { CreateWorktreeInput, WorktreeInfo } from "../../../application/software/compozyControlGateway";
import { controlFailure, controlOk, type ControlResult } from "../../../application/software/controlErrors";
import { worktreeCreatedSchema, worktreeInspectSchema, worktreeListSchema, type WorktreeRow } from "./compozyControlSchemas2";
import type { ControlCaller } from "./controlCaller";

const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const WORKTREE_OVERRIDES = { [CONFLICT_STATUS]: "conflict", [UNPROCESSABLE_STATUS]: "worktree_not_ready" } as const;

function toInfo(row: WorktreeRow, dirtyFiles: number | null = null): WorktreeInfo {
  return { id: row.id, name: row.name, state: row.state, workspaceId: row.workspace_id, path: row.path ?? null, dirty: row.dirty ?? (dirtyFiles ?? 0) > 0, branch: row.branch ?? null };
}

const base = (workspaceId: string) => `/api/workspaces/${encodeURIComponent(workspaceId)}/worktrees`;

export class CompozyWorktrees {
  constructor(private readonly caller: ControlCaller) {}

  list(workspaceId: string): Promise<ControlResult<WorktreeInfo[]>> {
    return this.caller.guarded({ method: "GET", path: base(workspaceId) }, worktreeListSchema, (body) => body.worktrees.map((row) => toInfo(row)));
  }

  get(workspaceId: string, worktreeId: string): Promise<ControlResult<WorktreeInfo>> {
    const path = `${base(workspaceId)}/${encodeURIComponent(worktreeId)}`;
    return this.caller.guarded({ method: "GET", path }, worktreeInspectSchema, (body) => toInfo(body.worktree, body.status?.dirty_files ?? null));
  }

  async create(input: CreateWorktreeInput): Promise<ControlResult<WorktreeInfo>> {
    const created = await this.caller.guarded({ method: "POST", path: base(input.workspaceId), body: { name: input.name } }, worktreeCreatedSchema, (body) => toInfo(body.worktree), WORKTREE_OVERRIDES);
    if (created.ok || created.code !== "conflict") return created;
    const listed = await this.list(input.workspaceId);
    if (!listed.ok) return listed;
    const existing = listed.value.find((item) => item.name === input.name);
    return existing ? controlOk(existing, listed.release) : controlFailure("conflict", listed.release);
  }
}
