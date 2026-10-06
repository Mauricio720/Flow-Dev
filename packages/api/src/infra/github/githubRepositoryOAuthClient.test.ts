import { expect, it, test, vi } from "vitest";
import { GitHubRepositoryOAuthClient } from "./githubRepositoryOAuthClient";
import { OAuthCodeRejectedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

const config = { clientId: "client", clientSecret: "secret", apiBase: "https://api.github.test", timeoutMs: 5 };
it("maps rejected OAuth codes to reconnect guidance", async () => {
  const client = new GitHubRepositoryOAuthClient(config, vi.fn(async () => Response.json({ error: "bad_verification_code" }, { status: 400 })));
  await expect(client.exchange("bad", "verifier")).rejects.toBeInstanceOf(OAuthCodeRejectedError);
});
it("bounds pending OAuth token and profile requests", async () => {
  const fetcher = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
  const client = new GitHubRepositoryOAuthClient(config, fetcher);
  await expect(client.exchange("code", "verifier")).rejects.toBeInstanceOf(RepositoryUnavailableError);
  await expect(client.profile("access")).rejects.toBeInstanceOf(RepositoryUnavailableError);
});
