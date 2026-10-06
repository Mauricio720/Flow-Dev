import { normalizeDestination } from "../application/auth/destination";
import type { RepositoryAuthorizationStore } from "../application/github/repositoryAuthorization";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { AccountMismatchError, InvalidOAuthStateError, OAuthCodeRejectedError, RepositoryAuthorizationNeededError } from "../application/github/repositoryErrors";

const REPOSITORY_OAUTH_SCOPES = "repo project offline_access";
type Principal = { userId: string; sessionId: string };
type Config = { origin: string; clientId: string; callbackUrl: string };
export class RepositoryOAuthController {
  constructor(private readonly service: RepositoryAuthorizationService, private readonly store: RepositoryAuthorizationStore, private readonly config: Config) {}
  async connect(principal: Principal, returnTo: string | null, origin: string | null) {
    if (origin !== this.config.origin) throw new Error("Invalid request origin");
    const destination = normalizeDestination(returnTo);
    if (returnTo !== null && returnTo !== destination) throw new Error("Invalid return destination");
    const flow = await this.service.begin({ userId: principal.userId, sessionId: principal.sessionId, returnTo: destination });
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.callbackUrl);
    url.searchParams.set("scope", REPOSITORY_OAUTH_SCOPES);
    url.searchParams.set("state", flow.state);
    url.searchParams.set("code_challenge", flow.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }
  async callback(principal: Principal, state: string, code: string) { return this.service.complete({ state, code, userId: principal.userId, sessionId: principal.sessionId, expectedGithubUserId: (await this.store.githubIdentity(principal.userId)) ?? undefined }); }
  async cancel(principal: Principal, state: string) { const result = await this.service.cancel(state, principal); return result ?? "/projects"; }
}

export function oauthFailure(error: unknown) {
  if (error instanceof AccountMismatchError) return "conta_diferente";
  if (error instanceof InvalidOAuthStateError || error instanceof OAuthCodeRejectedError) return "falha_autorizacao";
  if (error instanceof RepositoryAuthorizationNeededError) return "falha_autorizacao";
  return "falha_temporaria";
}
