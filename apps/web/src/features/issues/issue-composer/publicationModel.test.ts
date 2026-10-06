import { describe, expect, it } from "vitest";
import { publishedIssueUrl } from "./publicationModel";

const publication = { issueId: "1", issueNumber: 5, issueUrl: "https://github.com/team/flow/issues/5", createdAt: "2026-10-05T12:00:00.000Z", title: "t", bodyMarkdown: "b", repository: "team/flow" };

describe("publishedIssueUrl", () => {
  it("UT-069 rejects hosts and Issue numbers that do not match the retained identity", () => {
    expect(publishedIssueUrl(publication)).toBe("https://github.com/team/flow/issues/5");
    expect(publishedIssueUrl({ ...publication, issueUrl: "https://evil.example/team/flow/issues/5" })).toBeNull();
    expect(publishedIssueUrl({ ...publication, issueUrl: "https://github.com/team/flow/issues/6" })).toBeNull();
  });
});
