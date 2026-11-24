import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUTPUT_DIRECTORY = fileURLToPath(new URL("../src/infra/terminal/codex/protocol/generated/", import.meta.url));
const ROOT_TYPES = [
  "InitializeParams",
  "v2/ThreadStartParams",
  "v2/ThreadResumeParams",
  "v2/ThreadStartResponse",
  "v2/ThreadResumeResponse",
  "v2/TurnStartResponse",
  "v2/ThreadUnsubscribeParams",
  "v2/TurnStartParams",
  "v2/ItemStartedNotification",
  "v2/ItemCompletedNotification",
  "v2/FileChangeRequestApprovalParams",
  "v2/CommandExecutionRequestApprovalParams",
  "v2/CommandExecutionRequestApprovalResponse",
  "v2/PermissionsRequestApprovalParams",
  "v2/PermissionsRequestApprovalResponse",
  "v2/ToolRequestUserInputParams",
  "v2/ToolRequestUserInputResponse",
  "ReasoningEffort",
];
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /^\s*\/\/.*$/gm;
const RELATIVE_IMPORT = /from "(\.[^"]+)"/g;

function stripComments(source: string) {
  return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "").replace(/\n{2,}/g, "\n").trimStart();
}

async function collect(root: string, name: string, found: Map<string, string>) {
  if (found.has(name)) return;
  const source = await readFile(join(root, `${name}.ts`), "utf8");
  found.set(name, stripComments(source));
  for (const match of source.matchAll(RELATIVE_IMPORT)) await collect(root, normalize(join(dirname(name), match[1]!)), found);
}

async function writeAll(found: Map<string, string>) {
  await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
  for (const [name, source] of found) {
    const target = join(OUTPUT_DIRECTORY, `${name}.ts`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
}

async function main() {
  const generated = await mkdtemp(join(tmpdir(), "codex-protocol-"));
  try {
    await run("codex", ["app-server", "generate-ts", "--experimental", "--out", generated]);
    const found = new Map<string, string>();
    for (const name of ROOT_TYPES) await collect(generated, name, found);
    await writeAll(found);
    process.stdout.write(`${found.size} protocol types written\n`);
  } finally {
    await rm(generated, { recursive: true, force: true });
  }
}

void main();
