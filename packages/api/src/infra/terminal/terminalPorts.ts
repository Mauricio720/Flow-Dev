import type { ToolLocator } from "../../application/terminal/toolLocator";
import { PathToolLocator } from "./pathToolLocator";

export const FAKE_SCRIPT_VARIABLE = "FLOW_DEV_SESSION_FAKE_SCRIPT";
const TEST_ENVIRONMENT = "test";

export type TerminalPorts = { tools: ToolLocator };

const ALWAYS_AVAILABLE_TOOLS: ToolLocator = { has: async () => true };

export function terminalPorts(env: NodeJS.ProcessEnv): TerminalPorts {
  if (env[FAKE_SCRIPT_VARIABLE] && env.NODE_ENV === TEST_ENVIRONMENT) return { tools: ALWAYS_AVAILABLE_TOOLS };
  return { tools: new PathToolLocator(env) };
}
