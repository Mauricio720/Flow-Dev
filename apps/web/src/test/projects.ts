import type { AgentSettingView, AgentSettings, ConnectionState, Project, ProjectPage, RepositoryCandidate, RepositoryCandidatePage } from "@/lib/projects/contract";

type RepositoryFixture = { githubId: string; owner: string; name: string; visibility: string };

export function projectFixture(id: string, name: string, repository: RepositoryFixture, description: string | null = null): Project {
  return { id, name, description, detailsVersion: 1, isDemo: false, board: null, repository: { ...repository, nodeId: `R_${repository.githubId}`, archived: false } };
}

export const ACME_PRIVATE: RepositoryFixture = { githubId: "202", owner: "acme", name: "private", visibility: "private" };
export const OCTO_DOCS: RepositoryFixture = { githubId: "101", owner: "octo", name: "docs", visibility: "public" };
export const P1 = projectFixture("p1", "Projeto Alfa", ACME_PRIVATE, "Loja principal");
export const P2 = projectFixture("p2", "Projeto Docs", OCTO_DOCS);

export function pageOf(items: Project[], nextCursor: string | null = null): ProjectPage {
  return { items, nextCursor };
}

export function stateOf(projectId: string, kind: ConnectionState["kind"]): ConnectionState {
  return { projectId, kind };
}

export function trpcFailure(code: string) {
  return Object.assign(new Error(code), { data: { code } });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

export function pendingForever<T>() {
  return new Promise<T>(() => undefined);
}

export function candidateOf(repository: RepositoryFixture, linkedProjectId?: string): RepositoryCandidate {
  return { repository: { ...repository, visibility: "private", nodeId: `R_${repository.githubId}`, archived: false }, linkedProjectId };
}

export function candidatePage(items: RepositoryCandidate[], nextCursor: string | null = null): RepositoryCandidatePage {
  return { items, nextCursor };
}

export function projectConflict(conflict: string, existingProjectId?: string) {
  return Object.assign(new Error("CONFLICT"), { data: { code: "CONFLICT", conflict, existingProjectId } });
}

export const AGENT_CATALOG_FIXTURE = { claude: ["sonnet", "opus", "haiku"], codex: ["gpt-6.1-sol"] };

export function agentViewOf(agent: AgentSettingView["agent"], patch: Partial<AgentSettingView> = {}): AgentSettingView {
  return { agent, provider: "claude", model: "sonnet", effort: "low", version: 0, isDefault: true, modelAvailable: true, ...patch };
}

export function agentSettingsOf(patch: Partial<Record<AgentSettingView["agent"], Partial<AgentSettingView>>> = {}): AgentSettings {
  return { agents: [agentViewOf("issue_author", patch.issue_author), agentViewOf("planning", patch.planning)], catalog: AGENT_CATALOG_FIXTURE };
}
