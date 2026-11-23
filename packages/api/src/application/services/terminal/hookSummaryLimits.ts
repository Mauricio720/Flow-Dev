export const TEXT_SUMMARY_LIMIT = 500;
export const COMMAND_SUMMARY_LIMIT = 200;

export function clip(text: string, limit: number = TEXT_SUMMARY_LIMIT): string {
  return text.slice(0, limit);
}
