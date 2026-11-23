import { longCommandPrompt, bashStarted, childProcessIds } from "./lifecycleHelpers";
import { BYPASS, Session, assistantText, baseOptions, makeRepo, sleep, toolUses, verdict, type Log } from "./lib";

const SECRET_WORD = "ABACAXI";
const INTERRUPT_DEADLINE_MS = 5_000;
const DEFAULT_WAIT_SECONDS = 1_800;
const HEARTBEAT_MS = 60_000;

export async function runResume(log: Log) {
  const repo = await makeRepo();
  const first = new Session(baseOptions(repo, BYPASS), log);
  first.say(`Lembre da palavra secreta ${SECRET_WORD}. ${longCommandPrompt(60)}`);
  await bashStarted(first);
  await sleep(4_000);
  const claudeId = first.sessionId;
  const pids = childProcessIds();
  log.json("KILL", { claudeId, pids });
  for (const pid of pids) process.kill(pid, "SIGKILL");
  await Promise.race([first.finished, sleep(15_000)]);
  const ended = first.messages.at(-1);
  log.json("AFTER-KILL", { lastMessageType: ended?.type, total: first.messages.length });
  const second = new Session(baseOptions(repo, { ...BYPASS, resume: claudeId ?? undefined }), log);
  second.say("O que eu te pedi antes? Qual era a palavra secreta?");
  const answered = await second.waitFor((message) => message.type === "assistant" && assistantText(message).includes(SECRET_WORD), 90_000);
  const text = answered && answered.type === "assistant" ? assistantText(answered) : "";
  await second.close();
  verdict(log, "V-20f", Boolean(claudeId) && pids.length > 0 && text.includes(SECRET_WORD), `id=${claudeId}; pids mortos=${JSON.stringify(pids)}; resposta após resume=${JSON.stringify(text)}`);
}

export async function runInterrupt(log: Log) {
  const repo = await makeRepo();
  const session = new Session(baseOptions(repo, BYPASS), log);
  session.say(longCommandPrompt(30));
  await bashStarted(session);
  await sleep(3_000);
  const from = session.messages.length;
  const startedAt = Date.now();
  const receipt = await session.query.interrupt();
  const result = await session.waitFor((message) => message.type === "result", 20_000, from);
  const elapsed = Date.now() - startedAt;
  log.json("INTERRUPT", { receipt, elapsed, resultSubtype: result && result.type === "result" ? result.subtype : null });
  const next = await session.turn("Responda apenas a palavra OK2.");
  await session.close();
  verdict(log, "V-20g", result !== null && elapsed <= INTERRUPT_DEADLINE_MS && next.text.includes("OK2"), `vez terminou em ${elapsed} ms (limite ${INTERRUPT_DEADLINE_MS}); próxima mensagem respondida=${JSON.stringify(next.text)}`);
}

export async function runWait(log: Log, secondsArg?: string) {
  const waitMs = Number(secondsArg ?? DEFAULT_WAIT_SECONDS) * 1_000;
  const repo = await makeRepo();
  let released = false;
  const session = new Session(
    baseOptions(repo, {
      ...BYPASS,
      canUseTool: async (toolName, input) => {
        log.json("CAN-USE-TOOL", { toolName, waitMs });
        if (toolName !== "AskUserQuestion") return { behavior: "allow", updatedInput: input };
        const startedAt = Date.now();
        while (Date.now() - startedAt < waitMs) {
          await sleep(Math.min(HEARTBEAT_MS, waitMs - (Date.now() - startedAt)));
          log.line(`ESPERANDO ${Math.round((Date.now() - startedAt) / 1_000)}s de ${waitMs / 1_000}s; fluxo recebeu ${session.messages.length} mensagens`);
        }
        released = true;
        const questions = input.questions as Array<{ question: string }>;
        const answers = Object.fromEntries(questions.map((entry) => [entry.question, "Verde"]));
        return { behavior: "allow", updatedInput: { questions: input.questions, answers } };
      },
    }),
    log,
  );
  const { text } = await session.turn('Use a ferramenta AskUserQuestion para perguntar "Qual cor?" com as opções "Azul" e "Verde". Depois escreva "Escolhida: <resposta>".', waitMs + 300_000);
  await session.close();
  verdict(log, "V-20i", released && text.includes("Verde"), `espera de ${waitMs / 1_000}s sem erro de prazo; liberada=${released}; texto seguinte=${JSON.stringify(text)}`);
}

export async function runExit(log: Log) {
  const repo = await makeRepo();
  const session = new Session(baseOptions(repo, BYPASS), log);
  await session.turn("Responda apenas OK.");
  const from = session.messages.length;
  session.say("/exit");
  const answered = await session.waitFor((message) => message.type === "result", 30_000, from);
  await sleep(3_000);
  const afterExit = session.messages.slice(from).map((message) => ({ type: message.type, subtype: "subtype" in message ? message.subtype : undefined, text: message.type === "assistant" ? assistantText(message) : undefined }));
  log.json("AFTER-EXIT", afterExit);
  const followUp = await session.turn("Responda apenas OK3.", 60_000);
  log.json("FOLLOW-UP", { resultSeen: followUp.result !== null, text: followUp.text });
  await session.close();
  verdict(log, "V-20j", true, `/exit entregue como mensagem; resposta ao /exit=${answered ? "result recebido" : "nenhum result em 30 s"}; mensagens=${JSON.stringify(afterExit)}; a sessão aceitou uma mensagem depois=${followUp.text.includes("OK3")}`);
}
