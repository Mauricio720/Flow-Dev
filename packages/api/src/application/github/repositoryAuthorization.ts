export type RepositoryCredential = { userId: string; githubUserId: string; accessToken: string; refreshToken?: string; accessExpiresAt?: Date; refreshExpiresAt?: Date; scopes: string[] };
export type OAuthState = { stateHash: string; userId: string; sessionIdHash: string; codeVerifier: string; returnTo: string; expiresAt: Date };
export interface RepositoryAuthorizationStore {
  withCredentialLock<T>(userId: string, callback: (store: RepositoryAuthorizationStore) => Promise<T>): Promise<T>;
  saveCredential(credential: RepositoryCredential): Promise<void>;
  findCredential(userId: string): Promise<RepositoryCredential | null>;
  saveState(state: OAuthState): Promise<void>;
  consumeState(stateHash: string, now: Date): Promise<OAuthState | null>;
  githubIdentity(userId: string): Promise<string | null>;
}
export interface RepositoryOAuthClient {
  exchange(code: string, verifier: string): Promise<{ accessToken: string; refreshToken?: string; accessExpiresAt?: Date; refreshExpiresAt?: Date; scopes: string[] }>;
  profile(accessToken: string): Promise<{ id: string }>;
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; accessExpiresAt?: Date; refreshExpiresAt?: Date; scopes: string[] }>;
}
