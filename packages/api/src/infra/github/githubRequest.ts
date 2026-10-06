import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

export const GITHUB_TIMEOUT_MS = 10_000;
const SECONDARY_LIMIT_WAIT_SECONDS = 60;
type RequestInput = { url: string; init?: RequestInit };

export async function githubRequest<T>(fetcher: typeof fetch, input: RequestInput, timeoutMs = GITHUB_TIMEOUT_MS): Promise<{ body: T; headers: Headers }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new RepositoryUnavailableError()); }, timeoutMs);
  });
  try {
    return await Promise.race([readResponse<T>(fetcher, { ...input, init: { ...input.init, signal: controller.signal } }), deadline]);
  } finally { clearTimeout(timer!); }
}

async function readResponse<T>(fetcher: typeof fetch, input: RequestInput) {
  let response: Response;
  let body: T;
  try {
    response = await fetcher(input.url, input.init);
    const text = await response.text();
    body = text ? JSON.parse(text) as T : {} as T;
  } catch { throw new RepositoryUnavailableError(); }
  if (!response.ok) throw classify(response, body);
  return { body, headers: response.headers };
}

function classify(response: Response, body: unknown) {
  if (response.status === 401) return new RepositoryAuthorizationNeededError(undefined, response.status);
  if (response.status === 404) return new RepositoryNotFoundError();
  const message = typeof body === "object" && body && "message" in body ? String(body.message) : "";
  const limited = response.headers.has("retry-after") || response.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(message);
  if (response.status === 429 || response.status === 403 && limited) return new RepositoryRateLimitedError(retryDelay(response.headers));
  if (response.status === 403) return new RepositoryForbiddenError(response.status);
  return new RepositoryUnavailableError(undefined, response.status);
}

function retryDelay(headers: Headers) {
  const retry = headers.get("retry-after");
  if (retry && Number.isFinite(Number(retry))) return Math.max(0, Number(retry));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (reset) return Math.max(0, Math.ceil(reset - Date.now() / 1000));
  return SECONDARY_LIMIT_WAIT_SECONDS;
}
