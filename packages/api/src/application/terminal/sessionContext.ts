export const FLOW_DEV_SKILLS = ["spec-writer", "spec-to-tasks", "direct-executor", "spec-conformance"] as const;

export type FlowDevSkill = (typeof FLOW_DEV_SKILLS)[number];
export type SessionContextPaths = { sessionDir: string; contextDir: string; attachmentsDir: string };

export interface SessionContextBuilder {
  missingSkills(): Promise<string[]>;
  prepare(sessionId: string): Promise<SessionContextPaths>;
  discard(sessionId: string): Promise<void>;
  writePrompt(sessionId: string, prompt: string): Promise<void>;
  readPrompt(sessionId: string): Promise<string | null>;
  pathsOf(sessionId: string): SessionContextPaths;
}
