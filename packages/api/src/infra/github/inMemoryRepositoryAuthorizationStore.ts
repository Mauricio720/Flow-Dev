import type { OAuthState, RepositoryAuthorizationStore, RepositoryCredential } from "../../application/github/repositoryAuthorization";

export class InMemoryRepositoryAuthorizationStore implements RepositoryAuthorizationStore {
  private readonly locks = new Map<string, Promise<unknown>>();
  private readonly credentials = new Map<string, RepositoryCredential>();
  private readonly states = new Map<string, OAuthState>();
  private readonly identities = new Map<string, string>();
  async withCredentialLock<T>(userId: string, callback: (store: RepositoryAuthorizationStore) => Promise<T>): Promise<T> {
    const previous = this.locks.get(userId) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(() => callback(this));
    this.locks.set(userId, pending);
    try { return await pending; } finally { if (this.locks.get(userId) === pending) this.locks.delete(userId); }
  }
  async saveCredential(value: RepositoryCredential) { this.credentials.set(value.userId, { ...value }); this.identities.set(value.userId, value.githubUserId); }
  async findCredential(userId: string) { const value = this.credentials.get(userId); return value ? { ...value } : null; }
  async saveState(value: OAuthState) { this.states.set(value.stateHash, { ...value }); }
  async consumeState(stateHash: string, now: Date) { const value = this.states.get(stateHash); if (!value || value.expiresAt <= now || (value as OAuthState & { consumedAt?: Date }).consumedAt) return null; this.states.delete(stateHash); return { ...value }; }
  async githubIdentity(userId: string) { return this.identities.get(userId) ?? null; }
}
