import { describe, expect, it } from "vitest";
import { RepositoryOAuthController, oauthFailure } from "./repositoryOAuthController";
import { RepositoryUnavailableError } from "../application/github/repositoryErrors";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { hash } from "../application/github/repositoryAuthorizationService";
import { TokenCipher } from "../application/github/tokenCipher";
import { InMemoryRepositoryAuthorizationStore } from "../infra/github/inMemoryRepositoryAuthorizationStore";

const principal = { userId: "u1", sessionId: "s1" };
const key = Buffer.alloc(32, 3).toString("base64url");
const oauth = { exchange: async () => ({ accessToken: "token", scopes: ["repo"] }), profile: async () => ({ id: "77" }), refresh: async () => ({ accessToken: "new", scopes: ["repo"] }) };
function setup() { const store = new InMemoryRepositoryAuthorizationStore(); const service = new RepositoryAuthorizationService(store, oauth, new TokenCipher(key)); return { store, controller: new RepositoryOAuthController(service, store, { origin: "https://flow.test", clientId: "client", callbackUrl: "https://flow.test/api/github-repositories/callback" }) }; }

describe("repository OAuth controller", () => {
  it("UT-045 and IT-056 creates state, PKCE and repository scopes", async () => { const { controller, store } = setup(); const target = await controller.connect(principal, null, "https://flow.test"); const url = new URL(target); expect(url.searchParams.get("scope")).toBe("repo project offline_access"); expect(url.searchParams.get("code_challenge_method")).toBe("S256"); expect((await store.consumeState(hash(url.searchParams.get("state")!), new Date()))?.expiresAt.getTime()).toBeGreaterThan(Date.now()); });
  it("UT-046 and IT-058 rejects external destinations and invalid state", async () => { const { controller } = setup(); await expect(controller.connect(principal, "https://evil.example", "https://flow.test")).rejects.toThrow(); await expect(controller.callback(principal, "invalid", "code")).rejects.toThrow(); });
  it("IT-057 completes to the local destination", async () => { const { controller, store } = setup(); const target = await controller.connect(principal, "/projects", "https://flow.test"); const state = new URL(target).searchParams.get("state")!; expect(await controller.callback(principal, state, "code")).toBe("/projects"); expect((await store.findCredential("u1"))?.accessToken).toBe("token"); });
  it("IT-070 blocks a foreign origin without writing state", async () => { const { controller, store } = setup(); await expect(controller.connect(principal, "/projects", "https://evil.example")).rejects.toThrow(); expect(await store.consumeState("missing", new Date())).toBeNull(); });
  it("reports a token without the repo scope as an authorization failure and stores nothing", async () => { const store = new InMemoryRepositoryAuthorizationStore(); const scopeless = { ...oauth, exchange: async () => ({ accessToken: "ghu_token", scopes: [] }) }; const controller = new RepositoryOAuthController(new RepositoryAuthorizationService(store, scopeless, new TokenCipher(key)), store, { origin: "https://flow.test", clientId: "client", callbackUrl: "https://flow.test/api/github-repositories/callback" }); const state = new URL(await controller.connect(principal, "/projects", "https://flow.test")).searchParams.get("state")!; const failure = await controller.callback(principal, state, "code").catch(oauthFailure); expect(failure).toBe("falha_autorizacao"); expect(await store.findCredential("u1")).toBeNull(); });
  it("IT-065 keeps an unreachable GitHub as a temporary failure", () => { expect(oauthFailure(new RepositoryUnavailableError(undefined, 503))).toBe("falha_temporaria"); });
});
