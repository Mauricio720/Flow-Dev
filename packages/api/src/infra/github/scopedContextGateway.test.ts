import { describe, expect, it, vi } from "vitest";
import { GitHubScopedContextGateway } from "./scopedContextGateway";

const repository = { githubId: "202", nodeId: "R_node", owner: "acme", name: "cart", archived: false, visibility: "private" as const };

describe("GitHubScopedContextGateway", () => {
  it("UT-019 pins file evidence to the commit and bounds the requested line range", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ type: "file", encoding: "base64", content: Buffer.from("first\nsecond\nthird").toString("base64") }));
    const result = await new GitHubScopedContextGateway(fetcher).execute({ token: "secret", repository, commitSha: "a".repeat(40), request: { tool: "readProjectFile", path: "src/cart.ts", fromLine: 2, toLine: 3 } });
    expect(result.status).toBe("done");
    expect(result.evidence[0]).toMatchObject({ path: "src/cart.ts", commitSha: "a".repeat(40), fromLine: 2, toLine: 3 });
    expect(fetcher.mock.calls[0]?.[0]).toContain("ref=" + "a".repeat(40));
  });

  it("rejects issues whose URL escapes the selected repository", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 1, number: 9, title: "Foreign", state: "open", html_url: "https://github.com/other/repo/issues/9", body: "text" }));
    const result = await new GitHubScopedContextGateway(fetcher).execute({ token: "secret", repository, commitSha: "a".repeat(40), request: { tool: "getGitHubIssue", issueNumber: 9 } });
    expect(result).toMatchObject({ status: "unavailable", reason: "unsupported_context", evidence: [] });
  });

  it("UT-098 reports binary files and submodules as unsupported evidence", async () => {
    const binary = new GitHubScopedContextGateway(async () => Response.json({ type: "file", encoding: "base64", content: Buffer.from([0, 1, 2]).toString("base64") }));
    const submodule = new GitHubScopedContextGateway(async () => Response.json({ type: "submodule" }));
    const request = { token: "secret", repository, commitSha: "a".repeat(40), request: { tool: "readProjectFile" as const, path: "src/cart.ts", fromLine: 1, toLine: 1 } };
    await expect(binary.execute(request)).resolves.toMatchObject({ status: "unavailable", reason: "unsupported_context" });
    await expect(submodule.execute(request)).resolves.toMatchObject({ status: "unavailable", reason: "unsupported_context" });
  });

  it("UT-099 rejects files above one mebibyte without truncating source", async () => {
    const content = Buffer.alloc(1024 * 1024 + 1, 97).toString("base64");
    const gateway = new GitHubScopedContextGateway(async () => Response.json({ type: "file", encoding: "base64", content }));
    await expect(gateway.execute({ token: "secret", repository, commitSha: "a".repeat(40), request: { tool: "readProjectFile", path: "src/cart.ts", fromLine: 1, toLine: 1 } })).resolves.toMatchObject({ status: "unavailable", reason: "context_limit" });
  });

  it("UT-020 never follows redirects or sends a request after unsafe path validation", async () => {
    const fetcher = vi.fn();
    const result = await new GitHubScopedContextGateway(fetcher).execute({ token: "secret", repository, commitSha: "a".repeat(40), request: { tool: "readProjectFile", path: "../secrets", fromLine: 1, toLine: 1 } });
    expect(result.status).toBe("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
