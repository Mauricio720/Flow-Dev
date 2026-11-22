import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const APPLICATION_STATE_DIRECTORY = "flow-dev";
const SESSIONS_DIRECTORY = "terminal-sessions";
const STAGING_DIRECTORY = "terminal-staging";
const DEFAULT_STATE_RELATIVE_PATH = join(".local", "state");

function stateHome(env: NodeJS.ProcessEnv) {
  const configured = env.XDG_STATE_HOME;
  if (configured && isAbsolute(configured)) return configured;
  return join(env.HOME || homedir(), DEFAULT_STATE_RELATIVE_PATH);
}

export function terminalSessionsRoot(env: NodeJS.ProcessEnv = process.env) {
  return join(stateHome(env), APPLICATION_STATE_DIRECTORY, SESSIONS_DIRECTORY);
}

export function terminalStagingRoot(env: NodeJS.ProcessEnv = process.env) {
  return join(stateHome(env), APPLICATION_STATE_DIRECTORY, STAGING_DIRECTORY);
}
