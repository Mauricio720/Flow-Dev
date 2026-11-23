export const MAX_USER_MESSAGE_LENGTH = 20_000;
export const MAX_FREE_TEXT_LENGTH = 2_000;
export const MAX_STORED_TEXT_LENGTH = 50_000;
export const MAX_DISPLAY_LENGTH = 20_000;
export const TIMELINE_ENTRY_LIMIT = 200;
export const TRUNCATION_MARKER = "[mensagem cortada]";

export type TruncatedText = { text: string; truncated: boolean };

export function truncateWithMarker(text: string, limit: number): TruncatedText {
  if (text.length <= limit) return { text, truncated: false };
  return { text: text.slice(0, limit - TRUNCATION_MARKER.length) + TRUNCATION_MARKER, truncated: true };
}
