export type AssistantBlock = { type: string; text?: string };
export type AssistantLikeMessage = { parentToolUseId: string | null; content: AssistantBlock[] };

const TEXT_BLOCK = "text";
const BLOCK_SEPARATOR = "\n";

export function mainAssistantText(message: AssistantLikeMessage): string | null {
  if (message.parentToolUseId !== null) return null;
  const texts = message.content.flatMap((block) => (block.type === TEXT_BLOCK && block.text ? [block.text] : []));
  return texts.length > 0 ? texts.join(BLOCK_SEPARATOR) : null;
}
