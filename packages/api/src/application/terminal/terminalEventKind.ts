export const TERMINAL_EVENT_KINDS = ["started", "prompt", "skill", "file_edit", "command", "waiting", "attention", "ended"] as const;

export type TerminalEventKind = (typeof TERMINAL_EVENT_KINDS)[number];
