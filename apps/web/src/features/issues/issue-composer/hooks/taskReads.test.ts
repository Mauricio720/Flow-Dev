import { describe, expect, it } from "vitest";
import { taskApi } from "@/test/taskApi";
import { P, T, reviewDetail } from "@/test/tasks";
import { readSnapshot } from "./taskReads";

describe("taskReads", () => {
  it("UT-071 keeps the decision usable when only the conversation fails", async () => {
    taskApi.byId.query.mockResolvedValue(reviewDetail());
    taskApi.messages.query.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "INTERNAL_SERVER_ERROR", reason: "service_unavailable" } }));
    const snapshot = await readSnapshot({ projectId: P, taskId: T }, null);
    expect(snapshot.detail.planning.decision).not.toBeNull();
    expect(snapshot.conversationFailure).toMatchObject({ reason: "service_unavailable" });
    expect(snapshot.messages).toEqual([]);
  });

  it("does not refetch the conversation for a planning-only version change", async () => {
    taskApi.messages.query.mockResolvedValue({ items: [], nextCursor: null });
    taskApi.byId.query.mockResolvedValueOnce(reviewDetail({}, 10));
    const first = await readSnapshot({ projectId: P, taskId: T }, null);
    taskApi.byId.query.mockResolvedValueOnce(reviewDetail({}, 11));
    await readSnapshot({ projectId: P, taskId: T }, first);
    expect(taskApi.messages.query).toHaveBeenCalledTimes(1);
  });
});
