import { describe, expect, it } from "vitest";
import { GitHubHttpRepositoryGateway } from "./githubRepositoryGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

const response = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...(init.headers ?? {}) }, ...init });
const repository = { id: 202, node_id: "R_202", owner: { login: "acme" }, name: "private", private: true, archived: false };

describe("GitHub repository gateway", () => {
  it("UT-018 follows the repository Link cursor", async () => { const gateway = new GitHubHttpRepositoryGateway(async (input) => response([repository], { headers: { link: `<${input}>; rel="next"` } })); const first = await gateway.listAccessible("token"); expect(first.items[0]?.githubId).toBe("202"); expect(first.nextCursor).toBeTruthy(); });
  it("UT-019 rejects a changed identity", async () => { const gateway = new GitHubHttpRepositoryGateway(async () => response({ ...repository, id: 303 })); await expect(gateway.resolvePath("token", "acme", "old", "202")).rejects.toBeInstanceOf(RepositoryIdentityMismatchError); });
  it("UT-020 preserves Retry-After on rate limits", async () => { const gateway = new GitHubHttpRepositoryGateway(async () => response({}, { status: 429, headers: { "retry-after": "60" } })); await expect(gateway.listAccessible("token")).rejects.toMatchObject(new RepositoryRateLimitedError(60)); });
});

it("classifies revoked credentials and rate limited forbidden responses separately", async () => {
  const revoked = new GitHubHttpRepositoryGateway(async () => response({}, { status: 401 }));
  await expect(revoked.resolvePath("token", "acme", "repo")).rejects.toBeInstanceOf(RepositoryAuthorizationNeededError);
  const limited = new GitHubHttpRepositoryGateway(async () => response({ message: "API rate limit exceeded" }, { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.ceil(Date.now() / 1000) + 45) } }));
  await expect(limited.listAccessible("token")).rejects.toSatisfy((error) => error instanceof RepositoryRateLimitedError && (error.retryAfterSeconds ?? 0) >= 45);
  const denied = new GitHubHttpRepositoryGateway(async () => response({}, { status: 403 }));
  await expect(denied.listAccessible("token")).rejects.toBeInstanceOf(RepositoryForbiddenError);
});
it("applies a deadline to a request and to a response body that stalls", async () => {
  const pending = new GitHubHttpRepositoryGateway((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))), "https://api.test", 5);
  await expect(pending.listAccessible("token")).rejects.toBeInstanceOf(RepositoryUnavailableError);
  const pendingBody = new GitHubHttpRepositoryGateway(async (_url, init) => new Response(new ReadableStream({ start(controller) { init?.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError"))); } }), { status: 200 }), "https://api.test", 5);
  await expect(pendingBody.listAccessible("token")).rejects.toBeInstanceOf(RepositoryUnavailableError);
});
