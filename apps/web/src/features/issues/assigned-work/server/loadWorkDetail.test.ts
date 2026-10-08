import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { P, T, callerRejection, decisionOf, planningOf, publishedDetail } from "@/test/tasks";
import { viewOf } from "@/test/work";
import { loadWorkDetail } from "./loadWorkDetail";

const caller = vi.hoisted(() => ({ assignedIssues: { byTask: vi.fn() }, tasks: { byId: vi.fn() }, taskSpec: { byTask: vi.fn() }, taskFlow: { byTask: vi.fn() } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trpc/server", () => ({ getServerCaller: async () => caller }));

const SELECTION = { stage: "tech_spec", packageId: null, documentId: null } as const;

function approved() {
  const base = publishedDetail();
  return { ...base, planning: planningOf({ status: "approved", decision: decisionOf({ status: "approved" }) } as never) };
}

describe("loadWorkDetail", () => {
  it("reads the source view and task detail without starting any command", async () => {
    caller.assignedIssues.byTask.mockResolvedValue(viewOf());
    caller.tasks.byId.mockResolvedValue(publishedDetail());
    const load = await loadWorkDetail(P, T);
    expect(load.work).toMatchObject({ kind: "ready", snapshot: { view: { taskId: T } } });
    expect(caller.taskSpec.byTask).not.toHaveBeenCalled();
    expect(caller.taskFlow.byTask).not.toHaveBeenCalled();
  });

  it("reads the Spec and flow only for approved planning of unchanged source", async () => {
    caller.assignedIssues.byTask.mockResolvedValue(viewOf());
    caller.tasks.byId.mockResolvedValue(approved());
    caller.taskSpec.byTask.mockResolvedValue({ route: "prd", state: "not_started", specVersion: 0 });
    caller.taskFlow.byTask.mockResolvedValue({ flow: "unified" });
    const load = await loadWorkDetail(P, T, SELECTION);
    expect(load.spec).toEqual({ kind: "ready", snapshot: expect.objectContaining({ route: "prd" }) });
    expect(load.specSelection.stage).toBe("tech_spec");
    expect(caller.taskSpec.byTask).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T });
  });

  it("skips downstream reads when the source changed", async () => {
    caller.assignedIssues.byTask.mockResolvedValue(viewOf({ sourceChanged: true }));
    caller.tasks.byId.mockResolvedValue(approved());
    await loadWorkDetail(P, T);
    expect(caller.taskSpec.byTask).not.toHaveBeenCalled();
  });

  it("answers a malformed link as unavailable without any read", async () => {
    const load = await loadWorkDetail(P, "../outro");
    expect(load.work).toEqual({ kind: "failed", failure: { code: "NOT_FOUND", reason: "work_unavailable" } });
    expect(caller.assignedIssues.byTask).not.toHaveBeenCalled();
  });

  it("sends an expired session to sign-in with the exact work path", async () => {
    caller.assignedIssues.byTask.mockRejectedValue(callerRejection("UNAUTHORIZED"));
    caller.tasks.byId.mockResolvedValue(publishedDetail());
    await expect(loadWorkDetail(P, T)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(`/login?erro=sessao_expirada&next=${encodeURIComponent(`/projects/${P}/work/${T}`)}`);
  });
});
