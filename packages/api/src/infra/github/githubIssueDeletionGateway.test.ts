import { describe, expect, it, vi } from "vitest";
import { GitHubHttpIssueDeletionGateway } from "./githubIssueDeletionGateway";

const ISSUE_JSON = (overrides: Record<string, unknown> = {}) => ({
  data: {
    node: {
      __typename: "Issue",
      id: "I_41",
      number: 41,
      title: "Issue 41",
      viewerCanDelete: true,
      author: { __typename: "User", databaseId: 1001, login: "u1" },
      repository: { id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } },
      ...overrides,
    },
  },
});

function makeGateway(responses: ((url: string, init?: RequestInit) => Response)) {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => responses(String(url), init));
  return { gateway: new GitHubHttpIssueDeletionGateway(fetcher), fetcher };
}

const expected = { repositoryId: "202", repositoryNodeId: "R_202" };
const target = { repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_41", issueNumber: 41 };

describe("GitHubHttpIssueDeletionGateway", () => {
  it("UT-008 rejects a PullRequest node or board draft without removal", async () => {
    const { gateway, fetcher } = makeGateway(() => Response.json({ data: { node: { __typename: "PullRequest", id: "PR_1" } } }));
    expect(await gateway.inspect("token", "PR_1")).toEqual({ kind: "invalid_target" });
    expect(await gateway.inspect("token", "PR_1", expected)).toEqual({ kind: "invalid_target" });
    expect(fetcher.mock.calls.every(([, init]) => !String(init?.body).includes("deleteIssue"))).toBe(true);
  });

  it("UT-009 rejects mismatched frozen and provider repository IDs", async () => {
    const { gateway } = makeGateway(() => Response.json(ISSUE_JSON()));
    expect(await gateway.inspect("token", "I_41", { repositoryId: "101" })).toEqual({ kind: "identity_conflict" });
    expect(await gateway.inspect("token", "I_41", { repositoryId: "202", repositoryNodeId: "R_OTHER" })).toEqual({ kind: "identity_conflict" });
  });

  it("UT-010 accepts a rename only when stable IDs still match", async () => {
    const { gateway } = makeGateway(() => Response.json(ISSUE_JSON({ repository: { id: "R_202", databaseId: 202, name: "renamed", owner: { login: "acme" } } })));
    const facts = await gateway.inspect("token", "I_41", expected);
    expect(facts).not.toHaveProperty("kind");
    expect(facts).toMatchObject({ nodeId: "I_41", number: 41, repositoryId: "202", repositoryNodeId: "R_202", repositoryName: "renamed" });
  });

  it("UT-011 rejects viewerCanDelete=false before mutation", async () => {
    const { gateway, fetcher } = makeGateway(() => Response.json(ISSUE_JSON({ viewerCanDelete: false })));
    expect(await gateway.inspect("token", "I_41")).toEqual({ kind: "github_permission_denied" });
    expect(fetcher.mock.calls.every(([, init]) => !String(init?.body).includes("deleteIssue"))).toBe(true);
  });

  it("UT-012 maps GraphQL or organization policy denial safely", async () => {
    const { gateway } = makeGateway(() => Response.json({ errors: [{ type: "FORBIDDEN" }] }));
    expect(await gateway.remove("token", "I_41")).toEqual({ kind: "github_permission_denied" });
  });

  it("removes a verified Issue node and reports accepted", async () => {
    const { gateway } = makeGateway(() => Response.json({ data: { deleteIssue: { clientMutationId: null } } }));
    expect(await gateway.remove("token", "I_41")).toBe("accepted");
  });

  it("UT-017 accepts 410 only after same-repository read access", async () => {
    const { gateway } = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } } } });
      return new Response(null, { status: 410 });
    });
    expect(await gateway.absence("token", target)).toBe("absent");
  });

  it("UT-018 keeps 404 or null GraphQL node uncertain, never absent", async () => {
    const missingRepository = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: null } });
      return new Response(null, { status: 404 });
    });
    expect(await missingRepository.gateway.absence("token", target)).toEqual({ kind: "not_found" });
    const missingIssue = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } } } });
      return new Response(null, { status: 404 });
    });
    expect(await missingIssue.gateway.absence("token", target)).toEqual({ kind: "not_found" });
  });

  it("UT-019 rejects transfer or 301 without retargeting", async () => {
    const transferred = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 999, name: "private", owner: { login: "acme" } } } });
      return new Response(null, { status: 404 });
    });
    expect(await transferred.gateway.absence("token", target)).toEqual({ kind: "identity_conflict" });
    const redirected = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } } } });
      return new Response(null, { status: 301, headers: { location: "https://github.com/other/private/issues/41" } });
    });
    expect(await redirected.gateway.absence("token", target)).toEqual({ kind: "identity_conflict" });
  });

  it("reports present when the Issue still resolves after read access", async () => {
    const { gateway } = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } } } });
      return Response.json({ id: 41, number: 41, pull_request: undefined });
    });
    expect(await gateway.absence("token", target)).toBe("present");
  });

  it("UT-020 preserves a rate-limited provider response with retry seconds", async () => {
    const { gateway } = makeGateway(() => Response.json({ errors: [{ type: "RATE_LIMITED" }] }));
    expect(await gateway.remove("token", "I_41")).toMatchObject({ kind: "provider_rate_limited", retryAfterSeconds: 60 });
    const limited = makeGateway((url) => {
      if (String(url).includes("/graphql")) return Response.json({ data: { node: { __typename: "Repository", id: "R_202", databaseId: 202, name: "private", owner: { login: "acme" } } } });
      return new Response(null, { status: 429, headers: { "retry-after": "60" } });
    });
    expect(await limited.gateway.absence("token", target)).toMatchObject({ kind: "provider_rate_limited", retryAfterSeconds: 60 });
  });
});
