import { vi } from "vitest";

export type DeletionIssueState = {
  nodeId: string;
  number: number;
  title: string;
  state: string;
  repositoryId: number;
  repositoryNodeId: string;
  repositoryName: string;
  owner: string;
  authorDatabaseId: number | null;
  viewerCanDelete: boolean;
  restStatus: number;
  assigneeDatabaseId?: number;
};

export const ISSUE_41: DeletionIssueState = {
  nodeId: "I_fixture_41", number: 41, title: "Issue 41", state: "OPEN", repositoryId: 202, repositoryNodeId: "R_202",
  repositoryName: "private", owner: "acme", authorDatabaseId: 88, viewerCanDelete: true, restStatus: 200,
  assigneeDatabaseId: 88,
};

export class DeletionWorld {
  issue: DeletionIssueState | null = { ...ISSUE_41 };
  removeMode: "accepted" | "forbidden" | "rate_limited" | "timeout" = "accepted";
  removeDrop = false;
  removeDropApplied = true;
  absenceReadable = true;
  absenceStatus: number | null = null;
  repoNodeDatabaseId: number | null = 202;
  repoNodeKind: string | null = "Repository";
  mutations: string[] = [];
  readonly fetcher = vi.fn<typeof fetch>(async (url, init) => this.handle(String(url), init));

  reset() {
    Object.assign(this, {
      issue: { ...ISSUE_41 }, removeMode: "accepted" as const, removeDrop: false, removeDropApplied: true, absenceReadable: true,
      absenceStatus: null, repoNodeDatabaseId: 202, repoNodeKind: "Repository", mutations: [],
    });
    this.fetcher.mockClear();
  }

  private async handle(url: string, init?: RequestInit) {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as { query: string; variables: Record<string, unknown> } : null;
    if (url.includes("/repos/") && !url.endsWith("/graphql")) return this.handleRest();
    if (!url.endsWith("/graphql") || !body) return new Response("{}", { status: 404 });
    const query = body.query;
    if (query.includes("deleteIssue")) return this.handleRemove();
    if (query.includes("viewerCanDelete")) return this.handleInspect();
    if (query.includes("on Repository")) return this.handleRepository();
    return new Response("{}", { status: 404 });
  }

  private handleInspect() {
    const issue = this.issue;
    if (!issue) return Response.json({ data: { node: null } });
    return Response.json({
      data: { node: { __typename: "Issue", id: issue.nodeId, number: issue.number, title: issue.title, viewerCanDelete: issue.viewerCanDelete, author: issue.authorDatabaseId === null ? null : { __typename: "User", databaseId: issue.authorDatabaseId, login: "author" }, repository: { id: issue.repositoryNodeId, databaseId: issue.repositoryId, name: issue.repositoryName, owner: { login: issue.owner } } } },
    });
  }

  private handleRemove() {
    this.mutations.push(`deleteIssue:${this.removeMode}`);
    if (this.removeMode === "timeout") throw new TypeError("network down");
    if (this.removeMode === "forbidden") return Response.json({ errors: [{ type: "FORBIDDEN" }] });
    if (this.removeMode === "rate_limited") return Response.json({ errors: [{ type: "RATE_LIMITED" }] });
    if (this.removeDrop) { this.removeDrop = false; if (this.removeDropApplied) this.issue = null; throw new TypeError("network down"); }
    this.issue = null;
    return Response.json({ data: { deleteIssue: { clientMutationId: null } } });
  }

  private handleRepository() {
    if (this.repoNodeKind !== "Repository" || this.repoNodeDatabaseId === null) return Response.json({ data: { node: null } });
    const issue = this.issue;
    const name = issue ? issue.repositoryName : "private";
    const owner = issue ? issue.owner : "acme";
    return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: this.repoNodeDatabaseId, name, owner: { login: owner } } } });
  }

  private handleRest() {
    const status = this.absenceStatus ?? (this.issue === null ? 410 : this.issue.restStatus);
    return new Response(null, { status, headers: status === 429 ? { "retry-after": "60" } : {} });
  }
}
