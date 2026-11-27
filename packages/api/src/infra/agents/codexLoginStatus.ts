import type { LoginInspection } from "../../application/agent-accounts/agentLoginInspector";

const LOGGED_IN_PREFIX = "Logged in";

export function parseCodexLoginStatus(...streams: Array<string | undefined>): LoginInspection {
  const loggedIn = streams.some((stream) => stream?.trim().startsWith(LOGGED_IN_PREFIX));
  return { status: loggedIn ? "logged_in" : "logged_out", identity: null, plan: null, detail: null };
}
