import { e2eAuthSecret, e2eDatabaseUrl, e2eRepositoryTokenKey, fakeGithubUrl } from "./environment";
import { terminalStateDirectory } from "./sessionFiles";
import { sessionScriptDirectory } from "./sessionScript";

export const E2E_NEXT_DIST_DIR = ".next-e2e";
const FAKE_AGENT_LOGIN_STATE = "logged_in";

export function e2eServerEnvironment(baseURL: string): Record<string, string> {
  if (!e2eDatabaseUrl || !e2eAuthSecret || !e2eRepositoryTokenKey) return terminalEnvironment();
  return {
    ...terminalEnvironment(),
    DATABASE_URL: e2eDatabaseUrl,
    BETTER_AUTH_SECRET: e2eAuthSecret,
    BETTER_AUTH_URL: baseURL,
    GITHUB_REPOSITORY_TOKEN_KEY: e2eRepositoryTokenKey,
    FLOW_DEV_GITHUB_API_URL: fakeGithubUrl,
    FLOW_DEV_NEXT_DIST_DIR: E2E_NEXT_DIST_DIR,
  };
}

function terminalEnvironment() {
  return { FLOW_DEV_TERMINAL_ENABLED: "true", FLOW_DEV_SESSION_FAKE_SCRIPT: sessionScriptDirectory, XDG_STATE_HOME: terminalStateDirectory, FLOW_DEV_AGENT_LOGIN_FAKE: FAKE_AGENT_LOGIN_STATE };
}
