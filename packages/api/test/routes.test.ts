import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, type Fixture } from "./fixture";
import { RepositoryAuthorizationService } from "../src/application/github/repositoryAuthorizationService";
import { RepositoryOAuthController } from "../src/controllers/repositoryOAuthController";

const mocks = vi.hoisted(() => ({ session: { user: { id: "" }, session: { id: "route-session" } }, controller: undefined as unknown }));
vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn(async () => mocks.session) } } }));
vi.mock("@flow-dev/api/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/server")>();
  return { ...original, createProductionRepositoryOAuthController: () => mocks.controller };
});
import { POST } from "../../../apps/web/src/app/api/github-repositories/connect/route";
import { GET } from "../../../apps/web/src/app/api/github-repositories/callback/route";

let current: Fixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; mocks.controller = undefined; });

describe("OAuth Route Handlers and durable storage", () => {
  it("IT-056 and IT-070 returns GitHub redirect and blocks a foreign origin before storing state", async () => {
    current = await fixture();
    mocks.session.user.id = current.admin.id;
    mocks.controller = new RepositoryOAuthController(current.authorization, current.store, { origin: "https://flow.test", clientId: "app", callbackUrl: "https://flow.test/api/github-repositories/callback" });
    const denied = await POST(new Request("https://flow.test/api/github-repositories/connect", { method: "POST", headers: { origin: "https://evil.test" } }));
    expect(denied.status).toBe(403);
    expect((await current.client`SELECT count(*)::int AS n FROM github_repository_oauth_states`)[0]?.n).toBe(0);
    const response = await POST(new Request("https://flow.test/api/github-repositories/connect", { method: "POST", headers: { origin: "https://flow.test" } }));
    expect(response.status).toBe(303);
    const target = new URL(response.headers.get("location")!);
    expect(target.searchParams.get("scope")).toBe("repo offline_access");
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
    expect((await current.client`SELECT count(*)::int AS n FROM github_repository_oauth_states`)[0]?.n).toBe(1);
    mocks.controller = new RepositoryOAuthController(new RepositoryAuthorizationService(current.store, current.oauth, current.cipher), current.store, { origin: "https://flow.test", clientId: "app", callbackUrl: "https://flow.test/api/github-repositories/callback" });
  });
  it("IT-057 callback persists the encrypted credential and redirects locally", async () => {
    current = await fixture();
    mocks.session.user.id = current.admin.id;
    mocks.controller = new RepositoryOAuthController(current.authorization, current.store, { origin: "https://flow.test", clientId: "app", callbackUrl: "https://flow.test/api/github-repositories/callback" });
    const start = await POST(new Request("https://flow.test/api/github-repositories/connect", { method: "POST", headers: { origin: "https://flow.test" } }));
    const state = new URL(start.headers.get("location")!).searchParams.get("state");
    const callback = await GET(new Request(`https://flow.test/api/github-repositories/callback?state=${state}&code=ok`));
    expect(callback.status).toBe(303);
    expect(callback.headers.get("location")).toContain("/projects?connection=connected");
    const [row] = await current.client`SELECT access_token_ciphertext FROM github_repository_authorizations WHERE user_id=${current.admin.id}`;
    expect(row.access_token_ciphertext).not.toContain("oauth_test");
    expect((await current.store.findCredential(current.admin.id))?.accessToken).toBe("oauth_test");
  });
});
