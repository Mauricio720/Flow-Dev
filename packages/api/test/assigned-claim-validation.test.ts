import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { githubRepositoryAuthorizations, projectAssignments, taskIssueClaimAttempts, taskIssueClaims, taskIssueSources, tasks } from "../src/infra/database/schema";
import { assignedFixture, closeAssigned, ITEM_ID, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { OPTIONS, issue } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const item = (f: AssignedFixture) => f.world.items.get(ITEM_ID)!;
const cases: [string, (f: AssignedFixture) => void, string][] = [
  ["UT-021/IT-083 issue closed after the queue loaded", (f) => { item(f).issue!.state = "CLOSED"; }, "issue_ineligible"],
  ["UT-023/IT-084 Status has Ready but no In Progress", (f) => { f.world.options = f.world.options.filter((option) => option.name !== "In Progress"); }, "in_progress_missing"],
  ["UT-023 ambiguous duplicate In Progress options", (f) => { f.world.options.push({ id: "dup", name: "in progress" }); }, "in_progress_missing"],
  ["UT-022/IT-085 board item belongs to repository R2", (f) => { item(f).issue = issue(41, [88, 99], { repositoryNodeId: "R2", repositoryId: 303 }); }, "repository_mismatch"],
  ["IT-086 board item is a pull request", (f) => { Object.assign(item(f), { type: "PullRequest", issue: null }); }, "board_item_invalid"],
  ["IT-086 board item belongs to another board", (f) => { item(f).project = "PVT_other"; }, "board_item_invalid"],
  ["IT-016 issue is not on the linked board", (f) => { f.world.items.delete(ITEM_ID); }, "board_item_invalid"],
  ["IT-086 board item is archived", (f) => { item(f).archived = true; }, "board_item_invalid"],
  ["UT-024 fresh assignees exclude the claimant", (f) => { item(f).issue!.assignees = [99]; }, "issue_ineligible"],
  ["UT-027 board status is Backlog instead of Ready", (f) => { item(f).status = OPTIONS.backlog; }, "issue_ineligible"],
  ["board item names another issue", (f) => { item(f).issue = issue(77, [88]); }, "board_item_invalid"],
];

describe("assignedIssues.claim validation", () => {
  it.each(cases)("%s", async (_name, arrange, reason) => {
    arrange(f);
    expect(await rejection(f.caller(f.u1.id).claim(f.claimInput()))).toMatchObject({ code: "PRECONDITION_FAILED", reason });
    expect(f.world.mutations).toHaveLength(0);
    expect(await f.database.select().from(taskIssueClaims)).toHaveLength(0);
    expect(await f.database.select().from(taskIssueClaimAttempts)).toHaveLength(0);
    expect(await f.database.select().from(taskIssueSources)).toHaveLength(0);
    expect(await f.database.select().from(tasks)).toHaveLength(0);
    expect(f.world.queries).not.toContain("add_item");
  });

  it("accepts a claimant that appears only on the second assignee page", async () => {
    f.world.assigneePageSize = 1;
    item(f).issue!.assignees = [11, 12, 88];
    expect(await f.caller(f.u1.id).claim(f.claimInput())).toMatchObject({ state: "claimed", operatorId: f.u1.id });
    expect(f.world.queries.filter((query) => query === "assignees")).toHaveLength(2);
  });

  it("rejects a project without a linked board", async () => {
    await f.dao.updateBoard(f.project.id, null);
    expect(await rejection(f.caller(f.u1.id).claim(f.claimInput()))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "board_missing" });
  });

  it("hides the project from an unassigned caller", async () => {
    await f.database.delete(projectAssignments).where(eq(projectAssignments.userId, f.u2.id));
    expect(await rejection(f.caller(f.u2.id).claim(f.claimInput()))).toMatchObject({ code: "NOT_FOUND", reason: "work_unavailable" });
  });

  it("requires repository authorization from the claimant", async () => {
    await f.database.delete(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, f.u1.id));
    expect(await rejection(f.caller(f.u1.id).claim(f.claimInput()))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });
});
