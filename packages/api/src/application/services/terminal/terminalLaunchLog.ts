type LogFields = Record<string, string | number | boolean | null>;

export interface TerminalLog {
  opened(fields: LogFields): void;
  launchFailed(fields: LogFields): void;
  skillMissing(fields: LogFields): void;
  attachmentRejected(fields: LogFields): void;
  cleanup(fields: LogFields): void;
}

const LOG_PREFIX = "[terminal]";

function format(event: string, fields: LogFields) {
  const pairs = Object.entries(fields).map(([key, value]) => `${key}=${value}`);
  return `${LOG_PREFIX} ${event} ${pairs.join(" ")}`.trim();
}

export class ConsoleTerminalLog implements TerminalLog {
  opened(fields: LogFields) {
    console.info(format("opened", fields));
  }

  launchFailed(fields: LogFields) {
    console.error(format("launch_failed", fields));
  }

  skillMissing(fields: LogFields) {
    console.error(format("skill_missing", fields));
  }

  attachmentRejected(fields: LogFields) {
    console.warn(format("attachment_rejected", fields));
  }

  cleanup(fields: LogFields) {
    console.info(format("cleanup", fields));
  }
}
