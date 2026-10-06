import { GITHUB_TIMEOUT_MS, githubRequest } from "./githubRequest";
import type { RepositoryOAuthClient } from "../../application/github/repositoryAuthorization";
import { OAuthCodeRejectedError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

type Config = { clientId: string; clientSecret: string; apiBase: string; timeoutMs?: number };
export class GitHubRepositoryOAuthClient implements RepositoryOAuthClient {
  constructor(private readonly config: Config, private readonly fetcher: typeof fetch = fetch) {}
  async exchange(code: string, verifier: string) { const body = await this.token({ code, code_verifier: verifier }); return tokenResult(body); }
  async profile(accessToken: string) {
    const { body } = await githubRequest<{ id: string | number }>(this.fetcher, { url: this.config.apiBase + "/user", init: { headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json" } } }, this.config.timeoutMs ?? GITHUB_TIMEOUT_MS);
    return { id: String(body.id) };
  }
  async refresh(refreshToken: string) { const body = await this.token({ grant_type: "refresh_token", refresh_token: refreshToken }); return tokenResult(body); }
  private async token(input: Record<string, string>) {
    let body: Record<string, unknown>;
    try {
      ({ body } = await githubRequest<Record<string, unknown>>(this.fetcher, { url: "https://github.com/login/oauth/access_token", init: { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ client_id: this.config.clientId, client_secret: this.config.clientSecret, ...input }) } }, this.config.timeoutMs ?? GITHUB_TIMEOUT_MS));
    } catch (error) {
      if (error instanceof RepositoryAuthorizationNeededError || error instanceof RepositoryUnavailableError && error.status !== undefined && error.status < 500) throw new OAuthCodeRejectedError();
      if (error instanceof RepositoryForbiddenError || error instanceof RepositoryNotFoundError) throw new OAuthCodeRejectedError();
      throw error;
    }
    if (body.error) throw new OAuthCodeRejectedError();
    return body;
  }
}
function tokenResult(body: Record<string, unknown>) { const accessToken = typeof body.access_token === "string" ? body.access_token : null; if (!accessToken) throw new RepositoryUnavailableError(); const scopes = String(body.scope ?? "").split(/[ ,]+/).filter(Boolean); return { accessToken, refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined, accessExpiresAt: expiry(body.expires_in), refreshExpiresAt: expiry(body.refresh_token_expires_in), scopes }; }
function expiry(value: unknown) { return typeof value === "number" ? new Date(Date.now() + value * 1000) : undefined; }
