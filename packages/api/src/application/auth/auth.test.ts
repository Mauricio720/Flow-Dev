import { describe, expect, it } from "vitest";
import { mapGithubProfile } from "./githubProfile";
import { destinationProjectId, normalizeDestination } from "./destination";
import { OriginRateLimiter } from "./rateLimiter";
import { validateSocialRequest } from "./oauthPolicy";
import { projectListInputSchema } from "../../schemas/projects";

describe("auth contracts", () => {
  it("maps a GitHub profile without contact data", () => expect(mapGithubProfile({ id: 1001, login: "alice" })).toMatchObject({ accountId: "1001", name: "alice", email: "github-1001@flowdev.invalid" }));
  it("rejects a profile without numeric id", () => expect(() => mapGithubProfile({ id: 0, login: "alice" })).toThrow());
  it("sanitizes external destinations", () => { expect(normalizeDestination("https://evil.example")).toBe("/projects"); expect(normalizeDestination("/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toContain("/projects/"); });
  it("keeps project menu and administrator destinations and nothing else", () => {
    const project = "/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect([project + "/issues", project + "/settings", "/projects/new"].map(normalizeDestination)).toEqual([project + "/issues", project + "/settings", "/projects/new"]);
    expect(["//evil.example", "/projects\\evil", project + "/issues/../x", project + "?next=//evil.example", "/projects/new/x"].map(normalizeDestination)).toEqual(Array(5).fill("/projects"));
    expect(destinationProjectId(project + "/issues")).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(destinationProjectId("/projects/new")).toBeNull();
  });
  it("UT-059 keeps the exact task path and its project as a destination", () => {
    const task = "/projects/00000000-0000-4000-8000-000000000001/issues/00000000-0000-4000-8000-000000000011";
    expect(normalizeDestination(task)).toBe(task);
    expect(destinationProjectId(task)).toBe("00000000-0000-4000-8000-000000000001");
  });
  it("UT-060 never turns an external or malformed task link into a return target", () => {
    const task = "/projects/00000000-0000-4000-8000-000000000001/issues/00000000-0000-4000-8000-000000000011";
    expect(normalizeDestination("https://evil.example/task")).toBe("/projects");
    expect([task + "/extra", task.slice(0, -1), task + "?next=//evil.example", task.replace("/issues/", "/issues/%2e%2e/")].map(normalizeDestination)).toEqual(Array(4).fill("/projects"));
    expect(destinationProjectId("https://evil.example/task")).toBeNull();
  });
  it("limits the eleventh origin attempt", () => { const limiter = new OriginRateLimiter(); for (let index = 0; index < 10; index++) expect(limiter.allow("origin", index)).toBe(true); expect(limiter.allow("origin", 10)).toBe(false); });
  it("rejects client supplied OAuth scopes", () => expect(() => validateSocialRequest({ provider: "github", scopes: ["repo"] })).toThrow());
  it("rejects malformed pagination cursors", () => expect(() => projectListInputSchema.parse({ cursor: "50" })).toThrow());
});
