import path from "node:path";
import { FLOW_DEV_SKILLS } from "../../../terminal/sessionContext";

export type CodexSkillEntry = { threadId: string; name: string; path: string; contextSkillsPath: string };
export type CodexTurnPrompt = { threadId: string; text: string; skill?: CodexSkillEntry };

export function codexSkillHook(entry: CodexSkillEntry) {
  const known = FLOW_DEV_SKILLS.some((skill) => skill === entry.name);
  const expected = path.resolve(entry.contextSkillsPath, entry.name, "SKILL.md");
  if (!known || path.resolve(entry.path) !== expected) return null;
  return { hook_event_name: "PostToolUse", session_id: entry.threadId, tool_name: "Skill", tool_input: { skill: entry.name } };
}

export function codexPromptHooks(prompt: CodexTurnPrompt) {
  const base = { hook_event_name: "UserPromptSubmit", session_id: prompt.threadId, prompt: prompt.text };
  const skill = prompt.skill ? codexSkillHook(prompt.skill) : null;
  return skill ? [base, skill] : [base];
}
