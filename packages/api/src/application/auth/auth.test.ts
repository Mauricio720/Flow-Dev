import { describe, expect, it } from "vitest";
import { mapGithubProfile } from "./githubProfile";
import { normalizeDestination } from "./destination";
import { OriginRateLimiter } from "./rateLimiter";
import { validateSocialRequest } from "./oauthPolicy";

describe("auth contracts", () => {
  it("maps a GitHub profile without contact data", () => expect(mapGithubProfile({ id: 1001, login: "alice" })).toMatchObject({ accountId: "1001", name: "alice", email: "github-1001@flowdev.invalid" }));
  it("rejects a profile without numeric id", () => expect(() => mapGithubProfile({ id: 0, login: "alice" })).toThrow());
  it("sanitizes external destinations", () => { expect(normalizeDestination("https://evil.example")).toBe("/projects"); expect(normalizeDestination("/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toContain("/projects/"); });
  it("limits the eleventh origin attempt", () => { const limiter = new OriginRateLimiter(); for (let index = 0; index < 10; index++) expect(limiter.allow("origin", index)).toBe(true); expect(limiter.allow("origin", 10)).toBe(false); });
  it("rejects client supplied OAuth scopes", () => expect(() => validateSocialRequest({ provider: "github", scopes: ["repo"] })).toThrow());
});
