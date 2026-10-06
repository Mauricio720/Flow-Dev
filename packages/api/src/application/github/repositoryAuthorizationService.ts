import { createHash, randomBytes } from "node:crypto";
import type { RepositoryAuthorizationStore, RepositoryCredential, RepositoryOAuthClient } from "./repositoryAuthorization";
import { AccountMismatchError, InvalidOAuthStateError, RepositoryAuthorizationNeededError, RepositoryUnavailableError, RepositoryRateLimitedError } from "./repositoryErrors";
import { TokenCipher } from "./tokenCipher";

const STATE_TTL_MS = 10 * 60 * 1000;
const REQUIRED_SCOPE = "repo";

export class RepositoryAuthorizationService {
  constructor(private readonly store: RepositoryAuthorizationStore, private readonly client: RepositoryOAuthClient, private readonly cipher: TokenCipher, private readonly clock = () => new Date()) {}

  async begin(input: { userId: string; sessionId: string; returnTo: string }) {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    await this.store.saveState({ stateHash: hash(state), userId: input.userId, sessionIdHash: hash(input.sessionId), codeVerifier: verifier, returnTo: input.returnTo, expiresAt: new Date(this.clock().getTime() + STATE_TTL_MS) });
    return { state, verifier, challenge: challenge(verifier), returnTo: input.returnTo };
  }

  async complete(input: { state: string; code: string; userId: string; sessionId: string; expectedGithubUserId?: string }) {
    const state = await this.store.consumeState(hash(input.state), this.clock());
    if (!state || state.userId !== input.userId || state.sessionIdHash !== hash(input.sessionId)) throw new InvalidOAuthStateError();
    const token = await this.client.exchange(input.code, state.codeVerifier);
    if (!token.scopes.includes(REQUIRED_SCOPE)) throw new RepositoryAuthorizationNeededError();
    const profile = await this.refreshedProfile(token.accessToken);
    if (input.expectedGithubUserId && profile.id !== input.expectedGithubUserId) throw new AccountMismatchError();
    await this.store.withCredentialLock(input.userId, (store) => store.saveCredential({ userId: input.userId, githubUserId: profile.id, accessToken: token.accessToken, refreshToken: token.refreshToken, accessExpiresAt: token.accessExpiresAt, refreshExpiresAt: token.refreshExpiresAt, scopes: token.scopes }));
    return state.returnTo;
  }

  async accessToken(userId: string) {
    return this.store.withCredentialLock(userId, async (store) => {
      const credential = await store.findCredential(userId);
      if (!credential) return null;
      if (!credential.accessExpiresAt || credential.accessExpiresAt > this.clock()) return credential.accessToken;
      if (!credential.refreshToken || credential.refreshExpiresAt && credential.refreshExpiresAt <= this.clock()) throw new RepositoryAuthorizationNeededError();
      return this.refresh(credential, store);
    });
  }

  async githubIdentity(userId: string) {
    const [accountId, credential] = await Promise.all([this.store.githubIdentity(userId), this.store.findCredential(userId)]);
    return accountId && credential?.githubUserId === accountId ? accountId : null;
  }

  async cancel(state: string, principal: { userId: string; sessionId: string }) {
    const value = await this.store.consumeState(hash(state), this.clock());
    if (!value || value.userId !== principal.userId || value.sessionIdHash !== hash(principal.sessionId)) throw new InvalidOAuthStateError();
    return value.returnTo;
  }

  private async refresh(credential: RepositoryCredential, store: RepositoryAuthorizationStore) {
    let token;
    try { token = await this.client.refresh(credential.refreshToken!); }
    catch (error) {
      if (error instanceof RepositoryUnavailableError || error instanceof RepositoryRateLimitedError) throw error;
      throw new RepositoryAuthorizationNeededError("Repository authorization needs renewal");
    }
    if (!token.scopes.includes(REQUIRED_SCOPE)) throw new RepositoryAuthorizationNeededError();
    const profile = await this.refreshedProfile(token.accessToken);
    if (profile.id !== credential.githubUserId) throw new AccountMismatchError();
    await store.saveCredential({ ...credential, accessToken: token.accessToken, refreshToken: token.refreshToken ?? credential.refreshToken, accessExpiresAt: token.accessExpiresAt, refreshExpiresAt: token.refreshExpiresAt, scopes: token.scopes });
    return token.accessToken;
  }

  private async refreshedProfile(accessToken: string) {
    try { return await this.client.profile(accessToken); }
    catch { throw new RepositoryAuthorizationNeededError("Repository authorization needs renewal"); }
  }
}

export function hash(value: string) { return createHash("sha256").update(value).digest("base64url"); }
function challenge(verifier: string) { return createHash("sha256").update(verifier).digest("base64url"); }
