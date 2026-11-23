const EVENTS_PATH = "/api/terminal-sessions/events";
const HOOK_TIMEOUT_SECONDS = 5;
const FILE_TOOLS_MATCHER = "Write|Edit|MultiEdit|NotebookEdit|Bash|Skill";

export function eventsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${EVENTS_PATH}`;
}

function hookFor(input: { url: string; token: string }) {
  return { type: "http", url: input.url, headers: { Authorization: `Bearer ${input.token}` }, timeout: HOOK_TIMEOUT_SECONDS, onFailure: "continue" };
}

export function buildHookSettings(input: { baseUrl: string; token: string }) {
  const hooks = [hookFor({ url: eventsUrl(input.baseUrl), token: input.token })];
  const plain = [{ hooks }];
  return {
    hooks: {
      SessionStart: plain,
      UserPromptSubmit: plain,
      PostToolUse: [{ matcher: FILE_TOOLS_MATCHER, hooks }],
      Stop: plain,
      Notification: plain,
      SessionEnd: plain,
    },
  };
}
