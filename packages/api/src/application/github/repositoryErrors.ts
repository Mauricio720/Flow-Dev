export class RepositoryRateLimitedError extends Error { constructor(readonly retryAfterSeconds?: number) { super("GitHub rate limit reached"); } }
export class RepositoryUnavailableError extends Error { constructor(message?: string, readonly status?: number) { super(message); } }
export class RepositoryNotFoundError extends Error {}
export class RepositoryForbiddenError extends Error { constructor(readonly status?: number) { super(); } }
export class RepositoryAuthorizationNeededError extends Error { constructor(message?: string, readonly status?: number) { super(message); } }
export class RepositoryIdentityMismatchError extends Error {}
export class RepositoryArchivedError extends Error {}
export class AccountMismatchError extends Error {}
export class InvalidOAuthStateError extends Error {}
export class CredentialUnavailableError extends Error {}
export class OAuthCodeRejectedError extends Error {}
