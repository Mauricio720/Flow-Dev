import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { BYPASS, Session, baseOptions, makeRepo, verdict, type Log } from "./lib";

const PROMPT = 'Use a ferramenta AskUserQuestion com multiSelect verdadeiro para perguntar "Quais cores?" com as opções "Azul", "Verde" e "Rosa". Depois escreva exatamente "Escolhidas: <as respostas>" e pare.';

function handler(log: Log, shape: "array" | "joined"): CanUseTool {
  return async (toolName, input) => {
    log.json("CAN-USE-TOOL", { toolName, input });
    if (toolName !== "AskUserQuestion") return { behavior: "allow", updatedInput: input };
    const questions = input.questions as Array<{ question: string }>;
    const value = shape === "array" ? ["Azul", "Verde"] : "Azul, Verde";
    const answers = Object.fromEntries(questions.map((entry) => [entry.question, value]));
    log.json("ANSWERS-SENT", { shape, answers });
    return { behavior: "allow", updatedInput: { questions: input.questions, answers } };
  };
}

export async function runMulti(log: Log) {
  const repo = await makeRepo();
  for (const shape of ["array", "joined"] as const) {
    const session = new Session(baseOptions(repo, { ...BYPASS, canUseTool: handler(log, shape) }), log);
    const { text } = await session.turn(PROMPT);
    await session.close();
    const both = text.includes("Azul") && text.includes("Verde") && !text.includes("Rosa");
    verdict(log, `V-20c-multi-${shape}`, both, `resposta do Claude com ${shape}=${JSON.stringify(text.trim())}`);
  }
}
