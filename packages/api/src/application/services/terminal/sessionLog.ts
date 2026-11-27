export type SessionLogFields = Record<string, string | number | boolean | null>;

export interface SessionLog {
  info(event: string, fields?: SessionLogFields): void;
  error(event: string, fields?: SessionLogFields): void;
}

const LOG_PREFIX = "[session]";

function format(event: string, fields: SessionLogFields) {
  const pairs = Object.entries(fields).map(([key, value]) => `${key}=${value}`);
  return `${LOG_PREFIX} ${event} ${pairs.join(" ")}`.trim();
}

export class ConsoleSessionLog implements SessionLog {
  info(event: string, fields: SessionLogFields = {}) {
    console.info(format(event, fields));
  }

  error(event: string, fields: SessionLogFields = {}) {
    console.error(format(event, fields));
  }
}

export function errorFields(error: unknown): SessionLogFields {
  return { error: error instanceof Error ? error.message : String(error) };
}

export function accountLogField(session: { agentAccountId: string | null }): SessionLogFields {
  return { account: session.agentAccountId ?? "default" };
}
