import { CLAUDE_BINARY, TERMINAL_BINARY, type TerminalCommand } from "../../application/terminal/terminalLauncher";

const WORKING_DIRECTORY_FLAG = "--working-directory=";
const ARGUMENT_SEPARATOR = "--";
const SKIP_PERMISSIONS_FLAG = "--dangerously-skip-permissions";
const PLUGIN_DIRECTORY_FLAG = "--plugin-dir";
const SETTINGS_FLAG = "--settings";

export type TerminalCommandInput = { checkoutPath: string; contextDir: string; settingsPath: string; prompt: string };

export function buildTerminalCommand(input: TerminalCommandInput): TerminalCommand {
  const claudeFlags = [SKIP_PERMISSIONS_FLAG, PLUGIN_DIRECTORY_FLAG, input.contextDir, SETTINGS_FLAG, input.settingsPath];
  const args = [`${WORKING_DIRECTORY_FLAG}${input.checkoutPath}`, ARGUMENT_SEPARATOR, CLAUDE_BINARY, ...claudeFlags, ARGUMENT_SEPARATOR, input.prompt];
  return { file: TERMINAL_BINARY, args };
}
