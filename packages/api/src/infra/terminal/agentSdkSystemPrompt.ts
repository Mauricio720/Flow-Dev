import type { Options } from "@anthropic-ai/claude-agent-sdk";

export const FLOW_DEV_SESSION_GUIDANCE = [
  "Você está numa sessão aberta pelo Flow Dev. A pessoa operadora lê a conversa numa página web, não num terminal.",
  "Sempre que precisar de uma decisão dela entre alternativas conhecidas (escolher uma abordagem, confirmar um escopo, responder perguntas em aberto de uma spec), use a ferramenta AskUserQuestion: ela vira um cartão com opções selecionáveis na página.",
  "Faça até 4 perguntas por chamada, cada uma com 2 a 4 opções curtas e uma descrição do impacto; marque a recomendada com \"(Recomendado)\" no rótulo e coloque-a primeiro. A opção \"Outra\" já aparece sozinha.",
  "Não liste alternativas numeradas em texto esperando que ela digite a resposta. Se um documento pede as perguntas em aberto registradas (por exemplo Q-01 numa spec), registre no documento e pergunte também pela AskUserQuestion.",
].join("\n");

export const SESSION_SYSTEM_PROMPT: Options["systemPrompt"] = { type: "preset", preset: "claude_code", append: FLOW_DEV_SESSION_GUIDANCE, snapshot: true };
