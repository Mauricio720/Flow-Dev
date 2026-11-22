export const CLAUDE_BINARY = "claude";
export const TERMINAL_BINARY = "gnome-terminal";

export type TerminalCommand = { file: string; args: string[] };

export interface TerminalLauncher {
  launch(command: TerminalCommand): Promise<void>;
}

export interface ToolLocator {
  has(binary: string): Promise<boolean>;
}
