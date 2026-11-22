const ALLOWED_VARIABLES = ["PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "USER", "LOGNAME", "TMPDIR", "CLAUDE_CONFIG_DIR"] as const;

export function buildAgentEnvironment(source: NodeJS.ProcessEnv, extra: Record<string, string> = {}) {
  const environment: Record<string, string> = {};
  for (const name of ALLOWED_VARIABLES) {
    const value = source[name];
    if (value !== undefined) environment[name] = value;
  }
  return { ...environment, ...extra } as NodeJS.ProcessEnv;
}
