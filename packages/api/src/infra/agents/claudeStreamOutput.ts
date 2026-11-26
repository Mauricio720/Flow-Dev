type ClaudeEvent = { type?: string; structured_output?: unknown; is_error?: boolean; result?: unknown; api_error_status?: number };

export function claudeResultEvent(stdout: string): ClaudeEvent | null {
  let result: ClaudeEvent | null = null;
  for (const line of stdout.split("\n")) {
    try {
      const event = JSON.parse(line) as ClaudeEvent;
      if (event.type === "result") result = event;
    } catch { continue; }
  }
  return result;
}

export function claudeStructuredOutput(stdout: string, withImages: boolean) {
  const value = withImages ? claudeResultEvent(stdout)?.structured_output : parseJson(stdout)?.structured_output;
  return value && typeof value === "object" ? value : null;
}

function parseJson(stdout: string): ClaudeEvent | null {
  try { return JSON.parse(stdout.trim()) as ClaudeEvent; } catch { return null; }
}
