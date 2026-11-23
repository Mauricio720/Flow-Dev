import { readFile } from "node:fs/promises";
import { join } from "node:path";

const HOOK_FIXTURES = join(__dirname, "../../../../packages/api/test/fixtures/terminal-hooks");
const FIXTURE_CLONE = "/tmp/flow-dev-clone";

export async function hookPayload(name: string, clone: string, overrides: Record<string, unknown> = {}) {
  const text = (await readFile(join(HOOK_FIXTURES, `${name}.json`), "utf8")).replaceAll(FIXTURE_CLONE, clone);
  return { ...JSON.parse(text), ...overrides };
}

export function writeToolPayload(clone: string, relativePath: string) {
  return hookPayload("post-tool-use-write", clone, { tool_input: { file_path: join(clone, relativePath) }, tool_response: {} });
}
