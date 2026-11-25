import type { RuntimeHandlers } from "../../application/terminal/agentSessionRuntime";
import type { ScriptStep } from "./scriptedSessionSteps";
import type { SessionStartSource } from "./syntheticHooks";

export type RunnerConfig = { claudeSessionId: string; cwd: string; handlers: RuntimeHandlers; steps: ScriptStep[]; source: SessionStartSource; firstMessage: string };
