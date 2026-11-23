import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { BYPASS, Session, assistantText, baseOptions, makePlugin, makeRepo, toolUses, verdict, type Log } from "./lib";

const CHOSEN_ANSWER = "Verde";
const PROJECT_MARKER = "PONTEIRO";
const NO_TOOLS = { tools: [] as string[] };

function questionHandler(log: Log, calls: Array<Record<string, unknown>>): CanUseTool {
  return async (toolName, input, options) => {
    log.json("CAN-USE-TOOL", { toolName, input, toolUseID: options.toolUseID, suggestions: options.suggestions ?? null });
    if (toolName !== "AskUserQuestion") return { behavior: "allow", updatedInput: input };
    calls.push(input);
    const questions = input.questions as Array<{ question: string }>;
    const answers = Object.fromEntries(questions.map((entry) => [entry.question, CHOSEN_ANSWER]));
    return { behavior: "allow", updatedInput: { questions: input.questions, answers } };
  };
}

async function caseLogin(log: Log, repo: string) {
  const session = new Session(baseOptions(repo, BYPASS), log);
  const { result, text } = await session.turn("Responda apenas a palavra OK.");
  const init = session.messages.find((message) => message.type === "system" && message.subtype === "init");
  const source = init && init.type === "system" && init.subtype === "init" ? init.apiKeySource : "sem-init";
  verdict(log, "V-20a", result?.type === "result" && result.subtype === "success" && source === "none", `apiKeySource=${source}; sem ANTHROPIC_API_KEY no env; resposta=${JSON.stringify(text)}`);
  await session.close();
}

async function casePluginSkill(log: Log, repo: string) {
  const contextDir = await makePlugin();
  const session = new Session(baseOptions(repo, { ...BYPASS, plugins: [{ type: "local", path: contextDir }] }), log);
  const prompt = "/flow-dev:direct-executor Não implemente nada agora. Diga em uma frase qual é o seu objetivo e pare.";
  const { result, text } = await session.turn(prompt);
  const skillCalls = session.messages.flatMap((message) => (message.type === "assistant" ? toolUses(message).filter((use) => use.name === "Skill") : []));
  const init = session.messages.find((message) => message.type === "system" && message.subtype === "init");
  const skills = init && init.type === "system" && init.subtype === "init" ? init.skills : [];
  const loaded = skills.some((skill) => skill.includes("direct-executor"));
  verdict(log, "V-20b", loaded && result?.type === "result", `init.skills tem direct-executor=${loaded}; chamadas da ferramenta Skill=${JSON.stringify(skillCalls.map((use) => use.input))}; resposta=${JSON.stringify(text.slice(0, 200))}`);
  await session.close();
}

async function caseQuestions(log: Log, repo: string) {
  const calls: Array<Record<string, unknown>> = [];
  const session = new Session(baseOptions(repo, { ...BYPASS, canUseTool: questionHandler(log, calls) }), log);
  const prompt = `Use a ferramenta AskUserQuestion para me perguntar "Qual cor você prefere?" com as opções "Azul" (inclua o campo preview em Markdown com um bloco de código mostrando "azul") e "${CHOSEN_ANSWER}". Depois que eu responder, escreva exatamente "Escolhida: <a resposta>" e pare.`;
  const { text } = await session.turn(prompt);
  const received = calls.length > 0;
  verdict(log, "V-20c", received && text.includes(CHOSEN_ANSWER), `canUseTool recebeu AskUserQuestion em bypassPermissions=${received}; texto seguinte=${JSON.stringify(text)}`);
  const options = (calls[0]?.questions as Array<{ options: Array<{ preview?: string }> }> | undefined)?.[0]?.options ?? [];
  const previews = options.filter((option) => typeof option.preview === "string");
  verdict(log, "V-20d", previews.length > 0, `opções com preview=${previews.length}; amostra=${JSON.stringify(previews[0]?.preview ?? null)}`);
  await session.close();
}

async function caseSettingSources(log: Log) {
  const repo = await makeRepo({ "CLAUDE.md": `Comece toda resposta com a palavra ${PROJECT_MARKER}.\n` });
  const question = "O CLAUDE.md do projeto manda começar as respostas com qual palavra? Responda só a palavra, ou NENHUMA se não houver instrução.";
  const withSources = new Session(baseOptions(repo, { ...BYPASS, ...NO_TOOLS }), log);
  const loaded = await withSources.turn(question);
  await withSources.close();
  const without = new Session(baseOptions(repo, { ...BYPASS, ...NO_TOOLS, settingSources: [] }), log);
  const isolated = await without.turn(question);
  await without.close();
  const user = new Session(baseOptions(repo, { ...BYPASS, ...NO_TOOLS }), log);
  const personal = await user.turn("Seu contexto traz alguma instrução do usuário sobre 'Command output' (arquivo RTK.md)? Responda sim ou não e cite a primeira frase dela.");
  await user.close();
  const followedProject = loaded.text.includes(PROJECT_MARKER) && !isolated.text.includes(PROJECT_MARKER);
  const followedUser = /condensed|condensad/i.test(personal.text);
  verdict(log, "V-20k", followedProject && followedUser, `CLAUDE.md do projeto lido com user/project/local=${followedProject} (resposta ${JSON.stringify(loaded.text.trim())}; sem fontes: ${JSON.stringify(isolated.text.trim().slice(0, 80))}); CLAUDE.md pessoal do usuário carregado=${followedUser} (${JSON.stringify(personal.text.slice(0, 200))})`);
}

export async function basics(log: Log) {
  const repo = await makeRepo();
  log.line(`repo temporário ${repo}`);
  await caseLogin(log, repo);
  await casePluginSkill(log, repo);
  await caseQuestions(log, repo);
  await caseSettingSources(log);
}

export { assistantText };
