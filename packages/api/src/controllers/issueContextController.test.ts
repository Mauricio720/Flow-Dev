import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { IssueContextController } from "./issueContextController";

const capability = "c".repeat(48);
const execution = { taskId: "task", operationId: "op", executionId: "exec", fence: 2, userId: "user", sessionId: "session", projectId: "project", repositoryId: "202", repositoryNodeId: "node", repository: { githubId: "202", nodeId: "node", owner: "acme", name: "cart", archived: false, visibility: "private" as const }, pinnedCommitSha: null };
const digest = createHash("sha256").update(capability).digest("hex");

describe("IssueContextController", () => {
  it("UT-017 revalidates access and returns stored evidence for an idempotent call", async () => {
    const dao = { execution: vi.fn().mockResolvedValue(execution), supersededExecution: vi.fn().mockResolvedValue(false), activityCount: vi.fn().mockResolvedValue(0), pinCommit: vi.fn().mockResolvedValue("a".repeat(40)), findCall: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ inputHash: createHash("sha256").update(JSON.stringify({ tool: "searchProject", query: "cart" })).digest("hex"), response: { status: "empty", data: {}, evidence: [] } }), saveCall: vi.fn().mockResolvedValue({ status: "empty", data: {}, evidence: [] }) };
    const repositories = { contextCredentials: vi.fn().mockResolvedValue({ repository: execution.repository, token: "secret", defaultBranch: "main" }) };
    const gateway = { pinCommit: vi.fn().mockResolvedValue("a".repeat(40)), execute: vi.fn().mockResolvedValue({ status: "empty", data: {}, evidence: [] }) };
    const controller = new IssueContextController(dao as never, repositories as never, gateway as never);
    const input = { executionId: "exec", toolCallId: "call", request: { tool: "searchProject" as const, query: "cart" } };
    await controller.handle(input, capability);
    const replay = await controller.handle(input, capability);
    expect(replay).toMatchObject({ status: "empty" });
    expect(dao.execution).toHaveBeenCalledWith("exec", digest, expect.any(Date));
    expect(repositories.contextCredentials).toHaveBeenCalledTimes(2);
    expect(gateway.execute).toHaveBeenCalledTimes(1);
  });

  it("UT-018 does not look up GitHub when the task capability is invalid", async () => {
    const dao = { execution: vi.fn().mockResolvedValue(null), supersededExecution: vi.fn().mockResolvedValue(false) };
    const repositories = { contextCredentials: vi.fn() };
    const gateway = { pinCommit: vi.fn(), execute: vi.fn() };
    const controller = new IssueContextController(dao as never, repositories as never, gateway as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "cart" } }, capability)).rejects.toMatchObject({ reason: "capability_invalid" });
    expect(repositories.contextCredentials).not.toHaveBeenCalled();
    expect(gateway.execute).not.toHaveBeenCalled();
  });

  it("IT-073 distinguishes a superseded execution from an invalid capability", async () => {
    const dao = { execution: vi.fn().mockResolvedValue(null), supersededExecution: vi.fn().mockResolvedValue(true) };
    const controller = new IssueContextController(dao as never, {} as never, {} as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "cart" } }, capability)).rejects.toMatchObject({ reason: "stale_execution" });
  });

  it("IT-074 rejects context payloads over 16 KiB before execution lookup", async () => {
    const dao = { execution: vi.fn(), supersededExecution: vi.fn() };
    const gateway = { pinCommit: vi.fn(), execute: vi.fn() };
    const controller = new IssueContextController(dao as never, {} as never, gateway as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "x".repeat(17_000) } }, capability)).rejects.toMatchObject({ reason: "input_capacity" });
    expect(dao.execution).not.toHaveBeenCalled();
  });

  it("IT-075 never reports success when durable evidence persistence fails", async () => {
    const failure = new Error("database unavailable");
    const dao = { execution: vi.fn().mockResolvedValue(execution), supersededExecution: vi.fn().mockResolvedValue(false), activityCount: vi.fn().mockResolvedValue(0), pinCommit: vi.fn().mockResolvedValue("a".repeat(40)), findCall: vi.fn().mockResolvedValue(null), saveCall: vi.fn().mockRejectedValue(failure) };
    const repositories = { contextCredentials: vi.fn().mockResolvedValue({ repository: execution.repository, token: "secret", defaultBranch: "main" }) };
    const gateway = { pinCommit: vi.fn().mockResolvedValue("a".repeat(40)), execute: vi.fn().mockResolvedValue({ status: "done", data: {}, evidence: [] }) };
    const controller = new IssueContextController(dao as never, repositories as never, gateway as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "cart" } }, capability)).rejects.toBe(failure);
  });

  it("UT-097 records the context budget result without another repository read", async () => {
    const dao = { execution: vi.fn().mockResolvedValue(execution), supersededExecution: vi.fn(), activityCount: vi.fn().mockResolvedValue(12), findCall: vi.fn().mockResolvedValue(null), saveCall: vi.fn().mockResolvedValue({ status: "unavailable", reason: "context_limit", evidenceIds: [] }) };
    const repositories = { contextCredentials: vi.fn().mockResolvedValue({ repository: execution.repository, token: "secret", defaultBranch: "main" }) };
    const gateway = { pinCommit: vi.fn(), execute: vi.fn() };
    const controller = new IssueContextController(dao as never, repositories as never, gateway as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "cart" } }, capability)).resolves.toMatchObject({ status: "unavailable", reason: "context_limit" });
    expect(dao.saveCall).toHaveBeenCalledWith(execution, expect.objectContaining({ result: { status: "unavailable", reason: "context_limit", data: null, evidence: [] } }));
    expect(gateway.execute).not.toHaveBeenCalled();
  });

  it("UT-100 rejects a model-supplied repository scope before GitHub access", async () => {
    const dao = { execution: vi.fn().mockResolvedValue(execution), supersededExecution: vi.fn().mockResolvedValue(false), findCall: vi.fn().mockResolvedValue(null) };
    const repositories = { contextCredentials: vi.fn().mockResolvedValue({ repository: execution.repository, token: "secret", defaultBranch: "main" }) };
    const gateway = { pinCommit: vi.fn(), execute: vi.fn() };
    const controller = new IssueContextController(dao as never, repositories as never, gateway as never);
    await expect(controller.handle({ executionId: "exec", toolCallId: "call", request: { tool: "searchProject", query: "repo:evil/other checkout" } }, capability)).rejects.toMatchObject({ reason: "invalid_query" });
    expect(gateway.execute).not.toHaveBeenCalled();
  });
});
