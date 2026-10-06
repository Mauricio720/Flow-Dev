import { describe, expect, it, vi } from "vitest";
import { GitHubScopedContextGateway } from "./scopedContextGateway";

const repository = { githubId: "202", nodeId: "R_node", owner: "acme", name: "cart", archived: false, visibility: "private" as const };
const commitSha = "a".repeat(40);
const FORBIDDEN_STATUS = 403;
const emptyCodeSearch = { total_count: 0, incomplete_results: true, items: [] };
const tree = { truncated: false, tree: [{ path: "apps/web", type: "tree" }, { path: "apps/web/package.json", type: "blob" }, { path: ".github/package.yml", type: "blob" }, { path: "README.md", type: "blob" }] };

function fileResponse(text: string) {
  return Response.json({ type: "file", encoding: "base64", content: Buffer.from(text).toString("base64") });
}

function githubFetcher(codeSearch: Response, files: Record<string, string>) {
  return vi.fn(async (url: string) => {
    if (url.includes("/search/code")) return codeSearch;
    if (url.includes("/git/trees/")) return Response.json(tree);
    const path = decodeURIComponent(new URL(url).pathname.split("/contents/")[1] ?? "");
    return fileResponse(files[path] ?? "");
  });
}

function search(fetcher: ReturnType<typeof githubFetcher>, query: string) {
  return new GitHubScopedContextGateway(fetcher as unknown as typeof fetch).execute({ token: "secret", repository, commitSha, request: { tool: "searchProject", query } });
}

describe("searchProject", () => {
  it("falls back to the pinned commit tree when code search has no index for the repository", async () => {
    const fetcher = githubFetcher(Response.json(emptyCodeSearch), { "apps/web/package.json": "{\n  \"name\": \"web\"\n}" });
    const result = await search(fetcher, "package.json");
    expect(result.status).toBe("done");
    expect(result.data).toMatchObject({ matches: [{ path: "apps/web/package.json", line: 1, excerpt: "{", commitSha }] });
    expect(result.evidence[0]).toMatchObject({ path: "apps/web/package.json", commitSha, fromLine: 1, toLine: 1 });
    expect(fetcher.mock.calls.some(([url]) => url.includes(`/git/trees/${commitSha}?recursive=1`))).toBe(true);
  });

  it("falls back to the tree when code search is rate limited", async () => {
    const fetcher = githubFetcher(new Response("limited", { status: FORBIDDEN_STATUS }), { "README.md": "# Cart\nSee the readme" });
    const result = await search(fetcher, "readme");
    expect(result.data).toMatchObject({ matches: [{ path: "README.md", line: 2, excerpt: "See the readme" }] });
  });

  it("keeps indexed code search results and skips the tree", async () => {
    const indexed = Response.json({ total_count: 1, items: [{ path: "src/cart.ts", repository: { full_name: "acme/cart" } }] });
    const fetcher = githubFetcher(indexed, { "src/cart.ts": "export const items = [];\nexport function total() {}" });
    const result = await search(fetcher, "total");
    expect(result.data).toMatchObject({ matches: [{ path: "src/cart.ts", line: 2 }] });
    expect(fetcher.mock.calls.some(([url]) => url.includes("/git/trees/"))).toBe(false);
  });

  it("spreads evidence across matching files instead of filling it from the first one", async () => {
    const fetcher = githubFetcher(Response.json(emptyCodeSearch), { "apps/web/package.json": "web\nweb\nweb\nweb", "README.md": "web docs" });
    const result = await search(fetcher, "web readme");
    const paths = (result.data as { matches: Array<{ path: string }> }).matches.map((match) => match.path);
    expect(paths).toEqual(["README.md", "apps/web/package.json", "apps/web/package.json"]);
  });

  it("ignores hidden tree paths and reports empty when no path matches", async () => {
    const fetcher = githubFetcher(Response.json(emptyCodeSearch), {});
    await expect(search(fetcher, "github")).resolves.toMatchObject({ status: "empty", evidence: [] });
  });
});
