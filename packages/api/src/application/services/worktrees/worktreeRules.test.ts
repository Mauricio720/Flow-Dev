import { describe, expect, it } from "vitest";
import { effectiveChoice, previewStateOf, worktreeTargetOf } from "./worktreeRules";

const CHOSEN_AT = new Date("2026-11-25T12:00:00Z");

describe("worktree rules", () => {
  it("puts the worktree of an issue beside the configured clone, on the flow branch of the issue", () => {
    expect(worktreeTargetOf("/home/ana/Área de trabalho/Flow_Dev", 7)).toEqual({ checkoutRoot: "/home/ana/Área de trabalho/Flow_Dev", path: "/home/ana/Área de trabalho/Flow_Dev-worktrees/issue-7", branch: "flow/issue-7" });
  });

  it("requires a choice only while no session opened, and treats older work with sessions as without worktree", () => {
    expect(effectiveChoice({ choice: null, opened: false })).toEqual({ mode: null, locked: false });
    expect(effectiveChoice({ choice: null, opened: true })).toEqual({ mode: "checkout", locked: true });
    expect(effectiveChoice({ choice: { mode: "worktree", chosenByUserId: "u1", chosenAt: CHOSEN_AT }, opened: false })).toEqual({ mode: "worktree", locked: false });
    expect(effectiveChoice({ choice: { mode: "worktree", chosenByUserId: "u1", chosenAt: CHOSEN_AT }, opened: true })).toEqual({ mode: "worktree", locked: true });
  });

  it("tells a first creation apart from a recreation after something was removed outside Flow Dev", () => {
    expect(previewStateOf({ kind: "missing", branchExists: false }, false)).toBe("create");
    expect(previewStateOf({ kind: "missing", branchExists: false }, true)).toBe("restore_branch");
    expect(previewStateOf({ kind: "missing", branchExists: true }, false)).toBe("from_branch");
    expect(previewStateOf({ kind: "missing", branchExists: true }, true)).toBe("restore_folder");
    expect(previewStateOf({ kind: "branch_busy", busyPath: "/work/shop" }, true)).toBe("branch_busy");
    expect(previewStateOf({ kind: "conflict" }, false)).toBe("conflict");
  });
});
