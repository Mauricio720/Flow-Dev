import { createHash } from "node:crypto";
import type { IssueContextDao, ContextExecution } from "../application/database/dao/issueContextDao";
import type { IssueContextRequest, ScopedContextGateway, ScopedContextResult } from "../application/github/scopedContextGateway";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";

const MAX_INPUT_BYTES = 16 * 1024;
const MAX_RESULT_BYTES = 64 * 1024;

export class IssueContextController {
  constructor(private readonly dao: IssueContextDao, private readonly repositories: RepositoryAccessService, private readonly gateway: ScopedContextGateway, private readonly clock = () => new Date()) {}

  async handle(input: { executionId: string; toolCallId: string; request: IssueContextRequest }, capability: string) {
    validateCall(input, capability);
    const context = await this.requireExecution(input.executionId, capability);
    const resolved = await this.repositories.contextCredentials({ userId: context.userId, sessionId: context.sessionId }, context.projectId).catch(() => { throw new TaskError("access_revoked"); });
    if (resolved.repository.githubId !== context.repositoryId || resolved.repository.nodeId !== context.repositoryNodeId) throw new TaskError("access_revoked");
    const requestHash = hash(JSON.stringify(input.request));
    const saved = await this.dao.findCall(input.executionId, input.toolCallId);
    if (saved) return savedCall(saved, requestHash);
    validateRequest(input.request);
    if (await this.dao.activityCount(input.executionId) >= 12) return this.save(context, input, requestHash, { status: "unavailable", reason: "context_limit", data: null, evidence: [] }, safeTarget(input.request));
    const commitSha = await this.pinCommit(context, resolved);
    const startedAt = performance.now();
    const result = await this.gateway.execute({ token: resolved.token, repository: resolved.repository, commitSha, request: input.request });
    return this.save(context, input, requestHash, fitResult(result), safeTarget(input.request), Math.max(0, Math.round(performance.now() - startedAt)));
  }

  private async save(context: ContextExecution, input: { executionId: string; toolCallId: string; request: IssueContextRequest }, requestHash: string, result: ScopedContextResult, target: string, durationMs = 0) {
    const call = { executionId: input.executionId, toolCallId: input.toolCallId, inputHash: requestHash, request: input.request, result, durationMs, target };
    try { return await this.dao.saveCall(context, call); }
    catch (error) {
      const replay = await this.dao.findCall(input.executionId, input.toolCallId);
      if (replay) return savedCall(replay, requestHash);
      throw error;
    }
  }

  private async requireExecution(executionId: string, capability: string) {
    const capabilityHash = hash(capability);
    const context = await this.dao.execution(executionId, capabilityHash, this.clock());
    if (!context) throw new TaskError(await this.dao.supersededExecution(executionId, capabilityHash) ? "stale_execution" : "capability_invalid");
    return context;
  }

  private async pinCommit(context: ContextExecution, resolved: Awaited<ReturnType<RepositoryAccessService["contextCredentials"]>>) {
    if (context.pinnedCommitSha) return context.pinnedCommitSha;
    const commitSha = await this.gateway.pinCommit({ token: resolved.token, repository: resolved.repository, defaultBranch: resolved.defaultBranch }).catch(() => { throw new TaskError("provider_unavailable"); });
    return this.dao.pinCommit(context.executionId, context.fence, commitSha);
  }
}

function validateCall(input: { executionId: string; toolCallId: string; request: IssueContextRequest }, capability: string) {
  if (!capability || capability.length < 32 || capability.length > 128) throw new TaskError("capability_invalid");
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_INPUT_BYTES) throw new TaskError("input_capacity");
}

function validateRequest(request: IssueContextRequest) {
  if (request.tool === "readProjectFile" && (!Number.isInteger(request.fromLine) || !Number.isInteger(request.toLine) || request.fromLine < 1 || request.toLine < request.fromLine || request.toLine - request.fromLine >= 300 || !safePath(request.path))) throw new TaskError("invalid_path");
  if ((request.tool === "searchProject" || request.tool === "searchGitHubIssues") && (request.query.length > 180 || hasScopeOverride(request.query))) throw new TaskError("invalid_query");
  if (request.tool === "getGitHubIssue" && (!Number.isSafeInteger(request.issueNumber) || request.issueNumber < 1)) throw new TaskError("invalid_input");
}

function fitResult(result: ScopedContextResult): ScopedContextResult {
  if (Buffer.byteLength(JSON.stringify(result), "utf8") <= MAX_RESULT_BYTES) return result;
  return { status: "unavailable", reason: "context_limit", data: null, evidence: [] };
}

function savedCall(saved: { inputHash: string; response: unknown }, hashValue: string) {
  if (saved.inputHash !== hashValue) throw new TaskError("tool_key_reused");
  return saved.response;
}

function safeTarget(request: IssueContextRequest) { if (request.tool === "searchProject" || request.tool === "searchGitHubIssues") return request.query.slice(0, 180); if (request.tool === "readProjectFile") return request.path.slice(0, 240); return `#${request.issueNumber}`; }
function safePath(path: string) { const parts = path.replaceAll("\\", "/").split("/"); return Boolean(path && !path.startsWith("/") && !path.includes("\0") && parts.every((part) => part && part !== "." && part !== ".." && !part.startsWith("."))); }
function hasScopeOverride(query: string) { return /(^|\s)(repo|org|user|owner|path|filename):/iu.test(query) || /https?:\/\//iu.test(query); }
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
