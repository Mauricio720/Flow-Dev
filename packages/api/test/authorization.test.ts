import { RepositoryAuthorizationService } from "../src/application/github/repositoryAuthorizationService";
import { AccountMismatchError } from "../src/application/github/repositoryErrors";
import { afterEach, describe, expect, it } from "vitest";
import { fixture, type Fixture } from "./fixture";

let current: Fixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("durable GitHub authorization", () => {
  it("UT-043 serializes token rotation across service instances sharing PostgreSQL", async () => {
    current = await fixture();
    const now = new Date(Date.now() - 10_000);
    current.oauth.profile.mockResolvedValue({ id: "88" });
    await current.store.saveCredential({ userId: current.member.id, githubUserId: "88", accessToken: "old_access", refreshToken: "old_refresh", accessExpiresAt: now, scopes: ["repo"] });
    let refreshes = 0;
    current.oauth.refresh.mockImplementation(async () => { refreshes++; await new Promise((resolve) => setTimeout(resolve, 30)); return { accessToken: "rotated_access", refreshToken: "rotated_refresh", accessExpiresAt: new Date(Date.now() + 60_000), scopes: ["repo"] }; });
    const second = new RepositoryAuthorizationService(current.store, current.oauth, current.cipher);
    const values = await Promise.all([current.authorization.accessToken(current.member.id), second.accessToken(current.member.id)]);
    expect(values).toEqual(["rotated_access", "rotated_access"]);
    expect(refreshes).toBe(1);
    const [row] = await current.client`SELECT access_token_ciphertext, refresh_token_ciphertext FROM github_repository_authorizations WHERE user_id=${current.member.id}`;
    expect(row.access_token_ciphertext).not.toContain("rotated_access");
    expect(row.refresh_token_ciphertext).not.toContain("rotated_refresh");
    expect((await current.store.findCredential(current.member.id))?.refreshToken).toBe("rotated_refresh");
  });

  it("UT-044 rejects a refreshed token for a different GitHub identity without storing it", async () => {
    current = await fixture();
    await current.store.saveCredential({ userId: current.member.id, githubUserId: "88", accessToken: "old_access", refreshToken: "old_refresh", accessExpiresAt: new Date(Date.now() - 10_000), scopes: ["repo"] });
    current.oauth.profile.mockResolvedValue({ id: "999" });
    await expect(current.authorization.accessToken(current.member.id)).rejects.toBeInstanceOf(AccountMismatchError);
    expect((await current.store.findCredential(current.member.id))?.accessToken).toBe("old_access");
  });
  it("persists an OAuth credential through an encrypted database row", async () => {
    current = await fixture();
    const state = await current.authorization.begin({ userId: current.admin.id, sessionId: "session", returnTo: "/projects" });
    await current.authorization.complete({ state: state.state, code: "code", userId: current.admin.id, sessionId: "session", expectedGithubUserId: "77" });
    const [row] = await current.client`SELECT access_token_ciphertext FROM github_repository_authorizations WHERE user_id=${current.admin.id}`;
    expect(row.access_token_ciphertext).not.toContain("oauth_test");
    expect((await current.store.findCredential(current.admin.id))?.accessToken).toBe("oauth_test");
  });
});
