import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RuntimeExit, RuntimeHandlers } from "../../../../packages/api/src/application/terminal/claudeSessionRuntime";
import { ConsoleSessionLog } from "../../../../packages/api/src/application/services/terminal/sessionLog";
import { AgentSdkSessionRuntime } from "../../../../packages/api/src/infra/terminal/agentSdkSessionRuntime";
import { PathToolLocator } from "../../../../packages/api/src/infra/terminal/pathToolLocator";
import { cleanEnv, createLog, makePlugin, makeRepo, sleep } from "./lib";

const log = createLog("runtime-smoke");

function collector(answerWith?: string) {
  const state = { texts: [] as string[], hooks: [] as string[], exits: [] as RuntimeExit[], questions: 0 };
  const handlers: RuntimeHandlers = {
    onAssistantText: (text) => { state.texts.push(text); log.line(`TEXT ${JSON.stringify(text)}`); },
    onHook: (payload) => { state.hooks.push(String(payload.hook_event_name)); log.line(`HOOK ${String(payload.hook_event_name)} ${JSON.stringify(payload).slice(0, 160)}`); },
    onPermission: async (request) => {
      state.questions += 1;
      log.line(`PERMISSION ${request.toolName}`);
      const questions = (request.input.questions ?? []) as Array<{ question: string }>;
      return { behavior: "allow", updatedInput: { questions, answers: Object.fromEntries(questions.map((entry) => [entry.question, answerWith ?? "Verde"])) } };
    },
    onExit: (outcome) => { state.exits.push(outcome); log.line(`EXIT ${JSON.stringify(outcome)}`); },
  };
  return { state, handlers };
}

async function until(check: () => boolean, ms: number) {
  const deadline = Date.now() + ms;
  while (!check() && Date.now() < deadline) await sleep(100);
}

async function main() {
  const repo = await makeRepo();
  const contextDir = await makePlugin();
  const runtime = new AgentSdkSessionRuntime({ locator: new PathToolLocator(process.env), env: cleanEnv(), log: new ConsoleSessionLog() });
  const first = collector();
  const handle = runtime.start({ sessionId: "s1", cwd: repo, contextDir, permissionMode: "bypass", prompt: 'Use AskUserQuestion para perguntar "Qual cor?" com as opções "Azul" e "Verde" e depois escreva "Escolhida: <resposta>".', handlers: first.handlers });
  await until(() => first.state.hooks.includes("Stop"), 90_000);
  handle.push("Responda apenas OK2.");
  await until(() => first.state.texts.some((text) => text.includes("OK2")), 60_000);
  await handle.close();
  log.line(`RESULT-1 hooks=${first.state.hooks.join(",")} questions=${first.state.questions} texts=${JSON.stringify(first.state.texts)} exits=${JSON.stringify(first.state.exits)}`);
  const missingLogin = collector();
  const emptyConfig = await mkdtemp(join(tmpdir(), "flow-smoke-config-"));
  const noLogin = new AgentSdkSessionRuntime({ locator: new PathToolLocator(process.env), env: { ...cleanEnv(), CLAUDE_CONFIG_DIR: emptyConfig }, log: new ConsoleSessionLog() });
  noLogin.start({ sessionId: "s2", cwd: repo, contextDir, permissionMode: "bypass", prompt: "Responda OK", handlers: missingLogin.handlers });
  await until(() => missingLogin.state.exits.length > 0, 60_000);
  log.line(`RESULT-2 sem login: hooks=${missingLogin.state.hooks.join(",")} texts=${JSON.stringify(missingLogin.state.texts)} exits=${JSON.stringify(missingLogin.state.exits)}`);
}

main().then(() => process.exit(0), (error) => { log.line(`ERRO ${String(error)}`); process.exit(1); });
