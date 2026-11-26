import "./loadE2eEnvironment";
export const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
export const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
export const e2eRepositoryTokenKey = process.env.E2E_REPOSITORY_TOKEN_KEY;
export const e2eConfigured = Boolean(e2eDatabaseUrl && e2eAuthSecret && e2eRepositoryTokenKey);
export const E2E_SKIP_REASON = "Ambiente E2E não preparado: rode `pnpm --dir apps/web e2e:prepare` (cria o banco descartável e o apps/web/.env.e2e).";
const DEFAULT_FAKE_GITHUB_PORT = 3199;
export const fakeGithubPort = Number(process.env.E2E_FAKE_GITHUB_PORT ?? DEFAULT_FAKE_GITHUB_PORT);
export const fakeGithubUrl = `http://127.0.0.1:${fakeGithubPort}`;
