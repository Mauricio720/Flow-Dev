import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { Session, baseOptions, createLog, makeRepo, sleep } from "./lib";

const log = createLog("tracked-settings");
const handler: CanUseTool = async (toolName, input, options) => {
  log.json("CAN-USE-TOOL", { toolName, suggestions: options.suggestions });
  return { behavior: "allow", updatedInput: input, updatedPermissions: options.suggestions };
};

async function variant(label: string, tracked: boolean, content = "{}\n") {
  const repo = await makeRepo({ ".claude/settings.local.json": content });
  if (tracked) {
    execFileSync("git", ["add", "-f", ".claude/settings.local.json"], { cwd: repo });
    execFileSync("git", ["-c", "user.name=S", "-c", "user.email=s@e.com", "commit", "-q", "-m", "settings"], { cwd: repo });
  }
  log.line(`${label} status-antes=${JSON.stringify(execFileSync("git", ["ls-files", ".claude"], { cwd: repo, encoding: "utf8" }))}`);
  const session = new Session(baseOptions(repo, { permissionMode: "acceptEdits", canUseTool: handler }), log);
  await session.turn("Rode exatamente `pnpm --version` com a ferramenta Bash e me diga só a saída.");
  await sleep(2_000);
  await session.close();
  log.line(`${label} git=${JSON.stringify(execFileSync("git", ["status", "--porcelain", "--ignored"], { cwd: repo, encoding: "utf8" }))} grep=${JSON.stringify(execFileSync("sh", ["-c", "grep -rl \"pnpm --version\" . ~/.claude/settings.local.json 2>/dev/null | head -5; true"], { cwd: repo, encoding: "utf8" }))}`);
  log.line(`${label} settings=${JSON.stringify(await readFile(join(repo, ".claude/settings.local.json"), "utf8"))}`);
}

await variant("tracked-com-permissions", true, '{"permissions":{"allow":[]}}\n');
process.exit(0);
