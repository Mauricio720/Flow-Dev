import type { FlowAction, FlowConnection, FlowOptions, MovableWorkspaceKind } from "./unifiedContract";

const LOCAL_KIND = "local";
const MOVABLE_KINDS: string[] = ["isolated", LOCAL_KIND];

export const WORKSPACE_KIND_LABELS: Record<MovableWorkspaceKind, string> = { isolated: "Checkout isolado", local: "Projeto local vinculado" };

export function connectionsFor(connections: FlowConnection[], workspaceKind: string) {
  const target = workspaceKind === LOCAL_KIND ? "machine" : "host";
  return connections.filter((connection) => connection.executionTarget === target);
}

export function movableKinds(action: FlowAction, options: FlowOptions): MovableWorkspaceKind[] {
  if (!MOVABLE_KINDS.includes(action.workspace.kind)) return [];
  const offered = options.workspaces.map((workspace) => workspace.kind).filter((kind) => MOVABLE_KINDS.includes(kind));
  return offered.length > 1 ? offered : [];
}
