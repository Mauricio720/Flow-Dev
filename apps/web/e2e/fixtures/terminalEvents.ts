import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RecordedLaunch } from "./terminalLaunch";

const HOOK_FIXTURES = join(__dirname, "../../../../packages/api/test/fixtures/terminal-hooks");
const FIXTURE_CLONE = "/tmp/flow-dev-clone";
const SETTINGS_FLAG = "--settings";
const BEARER_PREFIX = "Bearer ";
const EVENTS_PATH = "/api/terminal-sessions/events";

export async function sessionTokenOf(launch: RecordedLaunch): Promise<string> {
  const settingsPath = launch.args[launch.args.indexOf(SETTINGS_FLAG) + 1]!;
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  return String(settings.hooks.Stop[0].hooks[0].headers.Authorization).slice(BEARER_PREFIX.length);
}

export async function hookPayload(name: string, clone: string, overrides: Record<string, unknown> = {}) {
  const text = (await readFile(join(HOOK_FIXTURES, `${name}.json`), "utf8")).replaceAll(FIXTURE_CLONE, clone);
  return { ...JSON.parse(text), ...overrides };
}

export function writeToolPayload(clone: string, relativePath: string) {
  return hookPayload("post-tool-use-write", clone, { tool_input: { file_path: join(clone, relativePath) }, tool_response: {} });
}

export function postHookEvent(input: { baseURL: string; token: string; payload: unknown }) {
  return fetch(`${input.baseURL}${EVENTS_PATH}`, { method: "POST", headers: { authorization: `${BEARER_PREFIX}${input.token}`, "content-type": "application/json" }, body: JSON.stringify(input.payload) });
}
