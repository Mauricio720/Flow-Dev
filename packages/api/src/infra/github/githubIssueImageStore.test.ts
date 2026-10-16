import { describe, expect, it, vi } from "vitest";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { GitHubHttpIssueImageStore } from "./githubIssueImageStore";

const write = { owner: "acme", name: "cart", token: "private-token", branch: "flow-dev-assets", path: "issue-images/t/i.png", content: new Uint8Array([1, 2, 3]), message: "Add issue image i" };
const REPO = "https://api.github.com/repos/acme/cart";
type Route = { method: string; url: string; status: number; body?: unknown };

function github(routes: Route[]) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    const route = routes.find((candidate) => candidate.method === method && candidate.url === String(url));
    return route ? Response.json(route.body ?? {}, { status: route.status }) : Response.json({}, { status: 500 });
  });
  return { store: new GitHubHttpIssueImageStore(fetcher), calls };
}

const fileUrl = `${REPO}/contents/issue-images/t/i.png`;
const fileLookup = `${fileUrl}?ref=flow-dev-assets`;
const branchLookup = `${REPO}/git/ref/heads/flow-dev-assets`;

describe("GitHubHttpIssueImageStore", () => {
  it("does not write an image that is already on the branch", async () => {
    const { store, calls } = github([{ method: "GET", url: fileLookup, status: 200 }]);
    await store.put(write);
    expect(calls.map((call) => call.method)).toEqual(["GET"]);
  });

  it("writes the file in base64 on the existing assets branch", async () => {
    const { store, calls } = github([{ method: "GET", url: fileLookup, status: 404 }, { method: "GET", url: branchLookup, status: 200 }, { method: "PUT", url: fileUrl, status: 201 }]);
    await store.put(write);
    expect(calls.at(-1)).toEqual({ method: "PUT", url: fileUrl, body: { message: "Add issue image i", content: "AQID", branch: "flow-dev-assets" } });
  });

  it("creates an orphan assets branch so the default branch history is never touched", async () => {
    const { store, calls } = github([
      { method: "GET", url: fileLookup, status: 404 }, { method: "GET", url: branchLookup, status: 404 },
      { method: "POST", url: `${REPO}/git/trees`, status: 201, body: { sha: "tree-sha" } }, { method: "POST", url: `${REPO}/git/commits`, status: 201, body: { sha: "commit-sha" } },
      { method: "POST", url: `${REPO}/git/refs`, status: 201 }, { method: "PUT", url: fileUrl, status: 201 },
    ]);
    await store.put(write);
    expect(calls.find((call) => call.url.endsWith("/git/commits"))?.body).toMatchObject({ tree: "tree-sha", parents: [] });
    expect(calls.find((call) => call.url.endsWith("/git/refs"))?.body).toEqual({ ref: "refs/heads/flow-dev-assets", sha: "commit-sha" });
  });

  it("reports a missing write permission as an image permission failure", async () => {
    const { store } = github([{ method: "GET", url: fileLookup, status: 404 }, { method: "GET", url: branchLookup, status: 200 }, { method: "PUT", url: fileUrl, status: 403 }]);
    await expect(store.put(write)).rejects.toThrowError(new TaskError("image_permission_denied"));
  });
});
