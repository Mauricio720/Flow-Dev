import { z } from "zod";
import type { RuntimeIdentity, RuntimeInteraction } from "../../../application/spec/specRuntimeGateway";
import { replayEvents } from "./compozyEvents";
import type { CompozyTransport } from "./compozyTransport";

const CLARIFY_EVENT = "clarify";
const QUESTION_KIND = "question";
const TRUNCATION_MARK = "...[truncated]";
const FIRST_SEQUENCE = 0;
const clarifyContent = z.object({ raw: z.object({ request: z.object({ request_id: z.string(), question: z.string(), choices: z.array(z.string()).nullish() }) }) });

type FullText = Pick<RuntimeInteraction, "title" | "choices">;
const fullTexts = new Map<string, FullText>();

function isTruncated(interaction: RuntimeInteraction) {
  return interaction.kind === QUESTION_KIND && [interaction.title ?? "", ...interaction.choices].some((text) => text.endsWith(TRUNCATION_MARK));
}

async function loadFullTexts(transport: CompozyTransport, identity: RuntimeIdentity) {
  for await (const event of replayEvents(transport, { ...identity, afterSequence: FIRST_SEQUENCE })) {
    const parsed = event.type === CLARIFY_EVENT ? clarifyContent.safeParse(event.content) : null;
    if (!parsed?.success) continue;
    const { request_id: requestId, question, choices } = parsed.data.raw.request;
    fullTexts.set(requestId, { title: question, choices: choices ?? [] });
  }
}

/** The interaction list shortens long questions; the session's clarify event keeps the text the agent wrote. */
export async function withFullQuestionText(transport: CompozyTransport, identity: RuntimeIdentity, interactions: RuntimeInteraction[]) {
  const shortened = interactions.filter(isTruncated);
  if (shortened.some((interaction) => !fullTexts.has(interaction.providerRequestId))) await loadFullTexts(transport, identity).catch(() => undefined);
  return interactions.map((interaction) => (isTruncated(interaction) ? { ...interaction, ...fullTexts.get(interaction.providerRequestId) } : interaction));
}
