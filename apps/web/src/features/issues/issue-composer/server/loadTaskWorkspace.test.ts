import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { DRAFT, O, P, R7, T, callerRejection, detailOf, messageOf, publishedDetail, summaryOf } from "@/test/tasks";
import { loadTaskWorkspace } from "./loadTaskWorkspace";

const caller = vi.hoisted(() => ({ tasks: { list: vi.fn(), byId: vi.fn(), messages: vi.fn() }, taskSpec: { byTask: vi.fn() }, taskFlow: { byTask: vi.fn() } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trpc/server", () => ({ getServerCaller: async () => caller }));

const PROPOSAL = { operationId: O, draft: { ...DRAFT, title: "Corrigir total do carrinho" }, baseRevisionId: R7 };

function serve() {
  caller.tasks.list.mockResolvedValue({ items: [summaryOf()], nextCursor: null });
  caller.tasks.byId.mockResolvedValue(detailOf({ pendingProposal: PROPOSAL }));
  caller.tasks.messages.mockResolvedValue({ items: [messageOf(1, "user", "Corrigir total")], nextCursor: null });
}

describe("loadTaskWorkspace", () => {
  it("UT-047 loads the confirmed revision and the pending proposal through the server caller", async () => {
    serve();
    const load = await loadTaskWorkspace(P, T);
    expect(load.task).toMatchObject({ kind: "ready", snapshot: { detail: { currentRevision: { id: R7 }, pendingProposal: { operationId: O } }, moreMessages: null } });
    expect(load.history).toMatchObject({ kind: "ready", page: { items: [{ id: T }] } });
    expect(caller.tasks.byId).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T });
    expect(caller.tasks.messages).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T, cursor: undefined, limit: 100 });
  });

  it("opens the history alone for a new intention", async () => {
    serve();
    expect(await loadTaskWorkspace(P, null)).toMatchObject({ taskId: null, task: { kind: "none" }, history: { kind: "ready" } });
    expect(caller.tasks.byId).not.toHaveBeenCalled();
  });

  it("answers a malformed task link as unavailable without reading any task", async () => {
    serve();
    expect((await loadTaskWorkspace(P, "../outro-projeto")).task).toEqual({ kind: "failed", failure: { code: "NOT_FOUND", reason: "task_unavailable" } });
    expect(caller.tasks.byId).not.toHaveBeenCalled();
  });

  it("keeps a failed history apart from an empty one and reports a missing repository authorization", async () => {
    caller.tasks.list.mockRejectedValue(callerRejection("PRECONDITION_FAILED", "repository_authorization_needed"));
    const load = await loadTaskWorkspace(P, null);
    expect(load.history).toEqual({ kind: "failed", failure: { code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" } });
  });

  it("sends an expired session to sign-in with the exact task as destination", async () => {
    serve();
    caller.tasks.byId.mockRejectedValue(callerRejection("UNAUTHORIZED"));
    await expect(loadTaskWorkspace(P, T)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(`/login?erro=sessao_expirada&next=${encodeURIComponent(`/projects/${P}/issues/${T}`)}`);
  });

  it("never reads the Spec or flow for a published task", async () => {
    caller.tasks.list.mockResolvedValue({ items: [summaryOf()], nextCursor: null });
    caller.tasks.byId.mockResolvedValue(publishedDetail());
    caller.tasks.messages.mockResolvedValue({ items: [], nextCursor: null });
    const load = await loadTaskWorkspace(P, T);
    expect(load.task.kind).toBe("ready");
    expect(caller.taskSpec.byTask).not.toHaveBeenCalled();
    expect(caller.taskFlow.byTask).not.toHaveBeenCalled();
  });
});
