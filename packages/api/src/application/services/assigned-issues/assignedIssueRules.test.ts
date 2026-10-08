import { describe, expect, it } from "vitest";
import type { BoardItemFacts } from "../../github/assignedIssueGateway";
import { assessItem, sourceContentHash } from "./assignedIssueRules";
import type { EligibilityContext } from "./assignedIssueRules";

const context: EligibilityContext = { repositoryNodeId: "R_fixture_flow", githubUserId: "1001", readyOptionId: "ready", boardNodeId: "board" };

function item(overrides: Partial<BoardItemFacts> = {}, issue: Partial<NonNullable<BoardItemFacts["issue"]>> = {}): BoardItemFacts {
  return { itemId: "PVTI_fixture_41", boardNodeId: "board", archived: false, contentType: "Issue", statusOptionId: "ready", issue: { nodeId: "I_fixture_41", number: 41, url: "https://github.com/acme/flow/issues/41", title: "Implement CSV export", body: "Implement CSV export.", state: "OPEN", updatedAt: "2026-10-01T00:00:00Z", repositoryNodeId: "R_fixture_flow", repositoryId: "101", repositoryOwner: "acme", repositoryName: "flow", assignees: [{ githubId: "1001", login: "u1" }], assigneesHasNextPage: false, assigneesCursor: null, ...issue }, ...overrides };
}

describe("assignedIssueRules", () => {
  it("UT-086 marks an open Ready issue assigned to the claimant in the linked repository as eligible", () => {
    expect(assessItem(item(), context)).toBe("eligible");
  });

  it("UT-015 excludes drafts, pull requests, closed issues and malformed issues", () => {
    expect(assessItem(item({ contentType: "DraftIssue", issue: null }), context)).toBe("not_issue");
    expect(assessItem(item({ contentType: "PullRequest", issue: null }), context)).toBe("not_issue");
    expect(assessItem(item({}, { state: "CLOSED" }), context)).toBe("closed");
    expect(assessItem(item({}, { nodeId: null }), context)).toBe("malformed");
    expect(assessItem(item({}, { title: null }), context)).toBe("malformed");
    expect(assessItem(item({ issue: null }), context)).toBe("malformed");
    expect(assessItem(item({ archived: true }), context)).toBe("archived");
  });

  it("UT-016 excludes issues assigned only to someone else or to nobody", () => {
    expect(assessItem(item({}, { assignees: [{ githubId: "1002", login: "u2" }] }), context)).toBe("not_assigned");
    expect(assessItem(item({}, { assignees: [] }), context)).toBe("not_assigned");
    expect(assessItem(item({}, { assignees: [], assigneesHasNextPage: true }), context)).toBe("assignees_incomplete");
  });

  it("excludes other repositories, other boards and non-Ready statuses", () => {
    expect(assessItem(item({}, { repositoryNodeId: "R2" }), context)).toBe("other_repository");
    expect(assessItem(item({ boardNodeId: "other" }), context)).toBe("other_board");
    expect(assessItem(item({ statusOptionId: "backlog" }), context)).toBe("not_ready");
  });

  it("hashes the exact title, body and identity without ambiguity", () => {
    const base = { repositoryId: "101", issueNodeId: "I1", title: "a", bodyMarkdown: "bc" };
    expect(sourceContentHash(base)).toBe(sourceContentHash({ ...base }));
    expect(sourceContentHash(base)).not.toBe(sourceContentHash({ ...base, title: "ab", bodyMarkdown: "c" }));
    expect(sourceContentHash(base)).toMatch(/^[a-f0-9]{64}$/);
  });
});
