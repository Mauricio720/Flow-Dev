import { describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../../database/dao/taskFlowTypes";
import { acceptedPendingOf, publishedTask } from "./acceptedPending";

const PENDING = "O segundo termo de aceite ficou fora de escopo.";
const source = { issueNumber: 25, title: "Atualizar textos", bodyMarkdown: "Corpo" };
const warning = (preview: string) => ({ sequence: 3, kind: "warning" as const, at: "2026-10-15T21:11:00.000Z", preview, tool: null, source: "Conector local", status: "direct_partial" });
const run = (kind: string, terminalCode: string | null, activity: RunRecord["activity"] = null) => ({ snapshot: { kind }, terminalCode, activity }) as unknown as RunRecord;

describe("accepted pending work", () => {
  it("reads what the latest direct execution left pending when it ended as partial", () => {
    expect(acceptedPendingOf([run("open_pull_request", null), run("direct_execute", "direct_partial", warning(PENDING))])).toBe(PENDING);
  });

  it("ignores a direct execution that completed later or ended for another reason", () => {
    expect(acceptedPendingOf([run("direct_execute", null), run("direct_execute", "direct_partial", warning(PENDING))])).toBeNull();
    expect(acceptedPendingOf([run("direct_execute", "direct_blocked", warning(PENDING))])).toBeNull();
    expect(acceptedPendingOf([run("direct_execute", "direct_partial", warning("  "))])).toBeNull();
  });

  it("adds the pending work only to the pull request task", async () => {
    const runs = { list: vi.fn(async () => ({ items: [run("direct_execute", "direct_partial", warning(PENDING))], nextCursor: null })) };
    expect(await publishedTask({ kind: "open_pull_request", taskId: "task-1", source, runs })).toEqual({ ...source, acceptedPending: PENDING });
    expect(await publishedTask({ kind: "direct_execute", taskId: "task-1", source, runs })).toBe(source);
    expect(runs.list).toHaveBeenCalledTimes(1);
  });
});
