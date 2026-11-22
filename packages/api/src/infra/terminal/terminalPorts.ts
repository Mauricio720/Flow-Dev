import type { TerminalLauncher, ToolLocator } from "../../application/terminal/terminalLauncher";
import { GnomeTerminalLauncher } from "./gnomeTerminalLauncher";
import { PathToolLocator } from "./pathToolLocator";
import { RecordingTerminalLauncher } from "./recordingTerminalLauncher";

export const FAKE_LAUNCH_FILE_VARIABLE = "FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE";
const PRODUCTION_ENVIRONMENT = "production";

export type TerminalPorts = { launcher: TerminalLauncher; tools: ToolLocator };

const ALWAYS_AVAILABLE_TOOLS: ToolLocator = { has: async () => true };

export function terminalPorts(env: NodeJS.ProcessEnv): TerminalPorts {
  const recordFile = env[FAKE_LAUNCH_FILE_VARIABLE];
  if (recordFile && env.NODE_ENV !== PRODUCTION_ENVIRONMENT) return { launcher: new RecordingTerminalLauncher(recordFile), tools: ALWAYS_AVAILABLE_TOOLS };
  return { launcher: new GnomeTerminalLauncher(), tools: new PathToolLocator(env) };
}
