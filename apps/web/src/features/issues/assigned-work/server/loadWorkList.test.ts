import { describe, expect, it, vi } from "vitest";
import { P, callerRejection } from "@/test/tasks";
import { queueItemOf, queuePageOf } from "@/test/work";
import { loadWorkList } from "./loadWorkList";

const caller = vi.hoisted(() => ({ assignedIssues: { list: vi.fn(), active: vi.fn() } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trpc/server", () => ({ getServerCaller: async () => caller }));

describe("loadWorkList", () => {
  it("loads the first Ready page and the caller's own active work", async () => {
    caller.assignedIssues.list.mockResolvedValue(queuePageOf([queueItemOf()]));
    caller.assignedIssues.active.mockResolvedValue({ items: [], nextCursor: null });
    const load = await loadWorkList(P);
    expect(load.queue).toMatchObject({ kind: "ready", page: { items: [{ number: 41 }] } });
    expect(caller.assignedIssues.active).toHaveBeenCalledExactlyOnceWith({ projectId: P, filter: "mine" });
  });

  it("keeps a failed queue apart from the empty one", async () => {
    caller.assignedIssues.list.mockRejectedValue(callerRejection("PRECONDITION_FAILED", "repository_authorization_needed"));
    caller.assignedIssues.active.mockResolvedValue({ items: [], nextCursor: null });
    const load = await loadWorkList(P);
    expect(load.queue).toEqual({ kind: "failed", failure: { code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" } });
    expect(load.active.kind).toBe("ready");
  });
});
