import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "../client";
import { accounts, githubRepositoryAuthorizations, githubRepositoryOAuthStates } from "../schema";
import type { OAuthState, RepositoryAuthorizationStore, RepositoryCredential } from "../../../application/github/repositoryAuthorization";
import { TokenCipher } from "../../../application/github/tokenCipher";

export class DrizzleRepositoryAuthorizationStore implements RepositoryAuthorizationStore {
  constructor(private readonly database: Database, private readonly cipher: TokenCipher, private readonly lockedUserId?: string) {}
  async withCredentialLock<T>(userId: string, callback: (store: RepositoryAuthorizationStore) => Promise<T>): Promise<T> {
    if (this.lockedUserId === userId) return callback(this);
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
      return callback(new DrizzleRepositoryAuthorizationStore(tx as unknown as Database, this.cipher, userId));
    });
  }
  async saveCredential(value: RepositoryCredential): Promise<void> {
    if (this.lockedUserId !== value.userId) return this.withCredentialLock(value.userId, (store) => store.saveCredential(value));
    await this.database.insert(githubRepositoryAuthorizations).values(encryptCredential(value, this.cipher)).onConflictDoUpdate({ target: githubRepositoryAuthorizations.userId, set: encryptCredential(value, this.cipher) });
  }
  async findCredential(userId: string) {
    const row = (await this.database.select().from(githubRepositoryAuthorizations).where(eq(githubRepositoryAuthorizations.userId, userId)).limit(1))[0];
    return row ? decryptCredential(row, this.cipher) : null;
  }
  async saveState(value: OAuthState) { await this.database.insert(githubRepositoryOAuthStates).values({ stateHash: value.stateHash, userId: value.userId, sessionIdHash: value.sessionIdHash, codeVerifierCiphertext: this.cipher.encrypt(value.codeVerifier), returnTo: value.returnTo, expiresAt: value.expiresAt }); }
  async consumeState(stateHash: string, now: Date) {
    const rows = await this.database.update(githubRepositoryOAuthStates).set({ consumedAt: now, updatedAt: now }).where(and(eq(githubRepositoryOAuthStates.stateHash, stateHash), isNull(githubRepositoryOAuthStates.consumedAt), gt(githubRepositoryOAuthStates.expiresAt, now))).returning();
    const row = rows[0];
    return row ? { stateHash: row.stateHash, userId: row.userId, sessionIdHash: row.sessionIdHash, codeVerifier: this.cipher.decrypt(row.codeVerifierCiphertext), returnTo: row.returnTo, expiresAt: row.expiresAt } : null;
  }
  async githubIdentity(userId: string) { return (await this.database.select({ accountId: accounts.accountId }).from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.providerId, "github"))).limit(1))[0]?.accountId ?? null; }
}

function encryptCredential(value: RepositoryCredential, cipher: TokenCipher) {
  return { userId: value.userId, githubUserId: value.githubUserId, accessTokenCiphertext: cipher.encrypt(value.accessToken), refreshTokenCiphertext: value.refreshToken ? cipher.encrypt(value.refreshToken) : null, accessExpiresAt: value.accessExpiresAt, refreshExpiresAt: value.refreshExpiresAt, grantedScopes: value.scopes, keyVersion: 1, updatedAt: new Date() };
}
function decryptCredential(row: typeof githubRepositoryAuthorizations.$inferSelect, cipher: TokenCipher): RepositoryCredential { return { userId: row.userId, githubUserId: row.githubUserId, accessToken: cipher.decrypt(row.accessTokenCiphertext), refreshToken: row.refreshTokenCiphertext ? cipher.decrypt(row.refreshTokenCiphertext) : undefined, accessExpiresAt: row.accessExpiresAt ?? undefined, refreshExpiresAt: row.refreshExpiresAt ?? undefined, scopes: row.grantedScopes }; }
