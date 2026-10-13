import type { FlowAction, FlowConnection, FlowOptions, MovableWorkspaceKind } from "./unifiedContract";

const LOCAL_KIND = "local";
const MOVABLE_KINDS: string[] = ["isolated", LOCAL_KIND];
const LOCAL_ONLY_ACTIONS = ["direct_execute", "open_pull_request"];

export const WORKSPACE_KIND_LABELS: Record<string, string> = { isolated: "Checkout isolado", local: "Projeto local vinculado", existing: "Worktree existente", new: "Novo worktree gerenciado" };

export function connectionsFor(connections: FlowConnection[], workspaceKind: string) {
  const target = workspaceKind === LOCAL_KIND ? "machine" : "host";
  return connections.filter((connection) => connection.executionTarget === target);
}

export function movableKinds(action: FlowAction, options: FlowOptions): MovableWorkspaceKind[] {
  if (LOCAL_ONLY_ACTIONS.includes(action.kind)) return [];
  const offered = options.workspaces.map((workspace) => workspace.kind).filter((kind) => MOVABLE_KINDS.includes(kind));
  if (["existing", "new"].includes(action.workspace.kind)) return offered.filter((kind) => kind === LOCAL_KIND) as MovableWorkspaceKind[];
  if (!MOVABLE_KINDS.includes(action.workspace.kind)) return [];
  return offered.length > 1 ? offered : [];
}
