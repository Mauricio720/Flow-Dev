import { describe, expect, it, vi } from "vitest";
import type { ClaimRecord, IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { IssueSourceDao, SourceRecord } from "../../database/dao/issueSourceDao";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";
import { ProjectUnavailableError } from "../access/projectAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import { WorkAuthorization } from "./workAuthorization";
import type { WorkOperability } from "./workOperability";

const scope = { projectId: "10000000-0000-4000-8000-000000000001", taskId: "20000000-0000-4000-8000-000000000001", actorId: "30000000-0000-4000-8000-000000000001" };
const other = "30000000-0000-4000-8000-000000000002";
const source = { snapshot: { id: "S1", contentHash: "hash" }, taskId: scope.taskId, identity: { issueNodeId: "I1" } } as SourceRecord;
const context = { repository: { nodeId: "R1", githubId: "101", archived: false }, token: "token", githubUserId: "1001" };
const claim = (overrides: Partial<ClaimRecord>) => ({ taskId: scope.taskId, state: "claimed", operatorUserId: scope.actorId, revision: 4, boardNodeId: "board", boardItemId: "item", optionId: "progress", ...overrides }) as ClaimRecord;

const changedIssue = { nodeId: "I1", number: 25, url: "https://github.com/owner/repo/issues/25", title: "Issue", body: "Texto atualizado", updatedAt: "2026-10-15T20:26:48Z", repositoryId: "101", repositoryNodeId: "R1", authorDatabaseId: null };
const refreshedSource = { ...source, snapshot: { id: "S2", contentHash: "other" }, created: false } as SourceRecord & { created: boolean };

function authorization(options: { claim?: ClaimRecord | null; source?: SourceRecord | null; access?: () => Promise<unknown>; blocked?: string | null; hash?: string } = {}) {
  const sources = { findByTask: vi.fn(async () => options.source === undefined ? source : options.source) } as unknown as IssueSourceDao;
  const claims = { claimByTask: vi.fn(async () => options.claim === undefined ? claim({}) : options.claim) } as unknown as IssueClaimDao;
  const blockReason = vi.fn(async () => ({ reason: options.blocked ?? null, contentHash: options.hash ?? "hash", issue: changedIssue }));
  const repositories = { personalContext: vi.fn(options.access ?? (async () => context)) };
  const refresher = { resolve: vi.fn(async () => refreshedSource) };
  return { service: new WorkAuthorization({ repositories: repositories as never, sources, claims, operability: { evaluate: blockReason } as unknown as WorkOperability, refresher }), blockReason, sources, refresher };
}

describe("WorkAuthorization.requireRead", () => {
  it("UT-018 requires repository authorization before any private issue output", async () => {
    const { service, sources } = authorization({ access: async () => { throw new RepositoryAuthorizationNeededError(); } });
    await expect(service.requireRead(scope)).rejects.toMatchObject({ reason: "repository_authorization_needed" });
    expect(sources.findByTask).not.toHaveBeenCalled();
  });

  it("hides inaccessible projects behind work_unavailable", async () => {
    const error = await authorization({ access: async () => { throw new ProjectUnavailableError(); } }).service.requireRead(scope).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AssignedIssueError);
    expect(error).toMatchObject({ reason: "work_unavailable" });
  });

  it("returns work_unavailable when the task has no verified source", async () => {
    await expect(authorization({ source: null }).service.requireRead(scope)).rejects.toMatchObject({ reason: "work_unavailable" });
  });
});

describe("WorkAuthorization.requireOperate", () => {
  it("UT-092 returns the work scope for the claimed operator with current eligibility", async () => {
    expect(await authorization({}).service.requireOperate(scope)).toEqual({ ...scope, sourceSnapshotId: "S1", claimRevision: 4 });
  });

  it("UT-034 reports claim_unresolved while the claim is pending or uncertain", async () => {
    for (const state of ["pending", "uncertain"] as const) await expect(authorization({ claim: claim({ state, operatorUserId: null }) }).service.requireOperate(scope)).rejects.toMatchObject({ reason: "claim_unresolved" });
  });

  it("UT-035 and UT-093 deny observers and authors who are not the operator", async () => {
    await expect(authorization({ claim: claim({ operatorUserId: other }) }).service.requireOperate(scope)).rejects.toMatchObject({ reason: "operator_required" });
    await expect(authorization({ claim: null }).service.requireOperate(scope)).rejects.toMatchObject({ reason: "operator_required" });
  });

  it("UT-075 surfaces a changed board status before any operation", async () => {
    await expect(authorization({ blocked: "board_status_changed" }).service.requireOperate(scope)).rejects.toMatchObject({ reason: "board_status_changed" });
  });

  it("UT-038 reports source_changed before a new decision when fresh content differs from the pinned snapshot", async () => {
    await expect(authorization({ hash: "other" }).service.requireOperate(scope, { currentSource: true })).rejects.toMatchObject({ reason: "source_changed" });
    await expect(authorization({ hash: "other" }).service.requireOperate(scope)).resolves.toMatchObject({ sourceSnapshotId: "S1" });
  });

  it("records the current GitHub text as the source when the operator asks to reanalyze it", async () => {
    const { service, refresher } = authorization({ hash: "other" });
    await expect(service.requireOperate(scope, { currentSource: true, refreshSource: true })).resolves.toMatchObject({ sourceSnapshotId: "S2" });
    expect(refresher.resolve).toHaveBeenCalledWith({ projectId: scope.projectId, actorId: scope.actorId, issue: changedIssue });
  });

  it("does not record a new source when the GitHub text is unchanged", async () => {
    const { service, refresher } = authorization({});
    await expect(service.requireOperate(scope, { currentSource: true, refreshSource: true })).resolves.toMatchObject({ sourceSnapshotId: "S1" });
    expect(refresher.resolve).not.toHaveBeenCalled();
  });

  it("UT-042 hides inaccessible projects as work_unavailable", async () => {
    await expect(authorization({ access: async () => { throw new ProjectUnavailableError(); } }).service.requireOperate(scope)).rejects.toMatchObject({ reason: "work_unavailable" });
  });

  it("reports provider failures to reads without failing them", async () => {
    const { service, blockReason } = authorization({});
    blockReason.mockRejectedValueOnce(new AssignedIssueError("provider_unavailable"));
    expect(await service.assess(scope, false)).toMatchObject({ reason: "provider_unavailable" });
    blockReason.mockRejectedValueOnce(new AssignedIssueError("provider_unavailable"));
    await expect(service.assess(scope, true)).rejects.toMatchObject({ reason: "provider_unavailable" });
  });
});
