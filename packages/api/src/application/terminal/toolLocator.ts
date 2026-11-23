export const CLAUDE_BINARY = "claude";

export interface ToolLocator {
  has(binary: string): Promise<boolean>;
}
