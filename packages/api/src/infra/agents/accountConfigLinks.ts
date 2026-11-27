export const CLAUDE_ACCOUNT_CONFIG_ITEMS = ["settings.json", "rules", "skills", "agents", "commands", "hooks", "plugins", "output-styles"] as const;
export const CODEX_ACCOUNT_CONFIG_ITEMS = ["config.toml", "AGENTS.md", "prompts", "skills", "rules"] as const;

export function allowedConfigNames(provider: "claude" | "codex", rootFiles: string[]) {
  const fixed = provider === "claude" ? CLAUDE_ACCOUNT_CONFIG_ITEMS : CODEX_ACCOUNT_CONFIG_ITEMS;
  const markdown = provider === "claude" ? rootFiles.filter((name) => /^.+\.md$/i.test(name)) : [];
  return [...new Set([...fixed, ...markdown])];
}
