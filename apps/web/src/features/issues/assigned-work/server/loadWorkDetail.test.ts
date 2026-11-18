import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { P, T, callerRejection, publishedDetail } from "@/test/tasks";
import { viewOf } from "@/test/work";
import { loadWorkDetail } from "./loadWorkDetail";

const caller = vi.hoisted(() => ({ assignedIssues: { byTask: vi.fn() }, tasks: { byId: vi.fn() } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trpc/server", () => ({ getServerCaller: async () => caller }));

describe("loadWorkDetail", () => {
  it("reads the source view and task detail without starting any command", async () => {
    caller.assignedIssues.byTask.mockResolvedValue(viewOf());
    caller.tasks.byId.mockResolvedValue(publishedDetail());
    const load = await loadWorkDetail(P, T);
    expect(load.work).toMatchObject({ kind: "ready", snapshot: { view: { taskId: T } } });
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
