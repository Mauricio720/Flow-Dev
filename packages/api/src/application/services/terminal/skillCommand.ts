const SKILL_COMMAND_PATTERN = /^\/([A-Za-z0-9_][\w.:-]*)(?=\s|$)/;
const NAMESPACE_SEPARATOR = ":";

const BUILT_IN_COMMANDS: ReadonlySet<string> = new Set(["exit", "quit", "clear", "compact", "help", "resume", "model", "config", "status"]);

export function normalizeSkillName(rawName: string): string {
  const separatorIndex = rawName.lastIndexOf(NAMESPACE_SEPARATOR);
  return separatorIndex === -1 ? rawName : rawName.slice(separatorIndex + 1);
}

export function parseSkillCommand(prompt: string): string | null {
  const match = SKILL_COMMAND_PATTERN.exec(prompt.trimStart());
  if (!match) return null;
  const name = normalizeSkillName(match[1]!);
  return name.length === 0 || BUILT_IN_COMMANDS.has(name) ? null : name;
}
