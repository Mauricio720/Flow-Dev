import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CanUseTool, PermissionUpdate } from "@anthropic-ai/claude-agent-sdk";
import { Session, baseOptions, makeRepo, verdict, type Log } from "./lib";

const COMMAND_PROMPT = "Rode exatamente `pnpm --version` com a ferramenta Bash e me diga só a saída.";
const ACCEPT_EDITS = { permissionMode: "acceptEdits" } as const;

function approvingHandler(log: Log, bashCalls: Array<PermissionUpdate[] | undefined>): CanUseTool {
  return async (toolName, input, options) => {
    log.json("CAN-USE-TOOL", { toolName, input, suggestions: options.suggestions ?? null, title: options.title, displayName: options.displayName, description: options.description, decisionReason: options.decisionReason });
    if (toolName !== "Bash") return { behavior: "allow", updatedInput: input };
    bashCalls.push(options.suggestions);
    const updated = (options.suggestions ?? []).map((suggestion) => ({ ...suggestion, destination: "localSettings" as const }));
    return { behavior: "allow", updatedInput: input, updatedPermissions: updated };
  };
}

async function readLocalSettings(repo: string) {
  try {
    return await readFile(join(repo, ".claude", "settings.local.json"), "utf8");
  } catch {
    return null;
  }
}

export async function runPermissions(log: Log) {
  const repo = await makeRepo();
  log.line(`repo temporário ${repo}`);
  const firstCalls: Array<PermissionUpdate[] | undefined> = [];
  const first = new Session(baseOptions(repo, { ...ACCEPT_EDITS, canUseTool: approvingHandler(log, firstCalls) }), log);
  const firstTurn = await first.turn(COMMAND_PROMPT);
  await first.close();
  const suggestions = firstCalls[0] ?? [];
  const settings = await readLocalSettings(repo);
  log.json("SUGGESTIONS", suggestions);
  log.line(`SETTINGS-LOCAL ${settings}`);
  const secondCalls: Array<PermissionUpdate[] | undefined> = [];
  const second = new Session(baseOptions(repo, { ...ACCEPT_EDITS, canUseTool: approvingHandler(log, secondCalls) }), log);
  const secondTurn = await second.turn(COMMAND_PROMPT);
  await second.close();
  const asked = firstCalls.length > 0 && suggestions.length > 0;
  const wrote = settings !== null && settings.includes("pnpm");
  verdict(log, "V-20e", asked && wrote && secondCalls.length === 0, `Bash chegou ao canUseTool com sugestões=${suggestions.length}; settings.local.json gravado=${wrote}; segunda sessão chamou canUseTool ${secondCalls.length}x; saídas=${JSON.stringify([firstTurn.text, secondTurn.text])}`);
}
