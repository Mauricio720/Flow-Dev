import type { Token, Tokens } from "marked";
import { chunkItems } from "./chunkItems";
import { chunksTitled, firstParagraph, type Chunk } from "./documentChunks";
import type { Journey } from "./viewTypes";

const JOURNEY_TITLE = /jornada|journey|experiência|user experience|fluxos? d[eo] usuário|user flow/i;
const NESTED_ITEM = /\n\s*(?:[-*+]|\d+\.)\s/;

function orderedSteps(tokens: Token[]) {
  return tokens.filter((token): token is Tokens.List => token.type === "list" && (token as Tokens.List).ordered)
    .flatMap((list) => list.items.map((item) => item.text.split(NESTED_ITEM)[0]!.trim()));
}

function journeyOf(chunk: Chunk): Journey[] {
  const steps = orderedSteps(chunk.tokens);
  const unordered = { ...chunk, tokens: chunk.tokens.filter((token) => token.type === "list" && !(token as Tokens.List).ordered) };
  const scenarios = chunkItems(unordered, false);
  const note = steps.length === 0 && scenarios.length === 0 ? firstParagraph(chunk) : null;
  if (steps.length === 0 && scenarios.length === 0 && !note) return [];
  return [{ id: `${chunk.source.documentId}:${chunk.source.sectionId}:${chunk.title}`, title: chunk.title, steps, scenarios, note, source: chunk.source }];
}

export function journeysOf(chunks: Chunk[]): Journey[] {
  return chunksTitled(chunks, JOURNEY_TITLE).flatMap(journeyOf);
}
