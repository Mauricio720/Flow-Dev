import { resolveCompozyBaseUrl } from "../src/infra/compozy/compozyEndpoint";

type Listed = { sessions?: { id: string }[] };
type Worktree = { id: string };
const JSON_HEADERS = { "content-type": "application/json" };
const STOP_BODY = JSON.stringify({ processes: "terminate" });
const CANCEL_BODY = JSON.stringify({ reason: "Flow Dev smoke cleanup" });

async function daemon(method: string, path: string, body?: string) {
  const response = await fetch(`${await resolveCompozyBaseUrl()}${path}`, { method, headers: JSON_HEADERS, body });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) as unknown : null };
}

export async function removeSmokeTask(taskId: string) {
  const canceled = await daemon("POST", `/api/tasks/${taskId}/cancel`, CANCEL_BODY);
  const deleted = await daemon("DELETE", `/api/tasks/${taskId}`);
  return { canceled: canceled.status, deleted: deleted.status };
}

export async function removeSmokeSessions(workspaceId: string) {
  const listed = (await daemon("GET", `/api/workspaces/${workspaceId}/sessions`)).body as Listed;
  const results: Record<string, number> = {};
  for (const session of listed.sessions ?? []) {
    await daemon("POST", `/api/workspaces/${workspaceId}/sessions/${session.id}/stop`, STOP_BODY);
    results[session.id] = (await daemon("DELETE", `/api/workspaces/${workspaceId}/sessions/${session.id}`)).status;
  }
  return results;
}

export async function removeSmokeWorktrees(workspaceId: string) {
  const listed = (await daemon("GET", `/api/workspaces/${workspaceId}/worktrees`)).body as { worktrees?: Worktree[] } | Worktree[] | null;
  const worktrees = Array.isArray(listed) ? listed : listed?.worktrees ?? [];
  const results: Record<string, number> = {};
  for (const worktree of worktrees) results[worktree.id] = (await daemon("DELETE", `/api/workspaces/${workspaceId}/worktrees/${worktree.id}?force=true&delete_branch=true`)).status;
  return results;
}

export async function removeSmokeWorkspace(workspaceId: string) {
  return (await daemon("DELETE", `/api/workspaces/${workspaceId}`)).status;
}
