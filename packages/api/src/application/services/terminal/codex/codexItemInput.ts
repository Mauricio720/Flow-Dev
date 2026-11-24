export type CodexTextBlock = { type: string; text?: string };
export type CodexCompletedItem = { type: string; text?: string; content?: CodexTextBlock[]; [key: string]: unknown };
export type CodexItemInput = { threadId: string; mainThreadId: string; item: CodexCompletedItem; completed: boolean };

export function codexTextOf(item: CodexCompletedItem): string | null {
  if (typeof item.text === "string") return item.text.length > 0 ? item.text : null;
  const text = (item.content ?? []).filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text!);
  return text.length > 0 ? text.join("\n") : null;
}
