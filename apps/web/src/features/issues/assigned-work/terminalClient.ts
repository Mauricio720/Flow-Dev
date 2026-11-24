import { trpc } from "@/lib/trpc/client";
import type { PreviewPurpose, TerminalOpenInput, TerminalScope } from "./terminalContract";

export function fetchTerminalPreflight(scope: TerminalScope, purpose?: PreviewPurpose) {
  return trpc.tasks.terminal.preflight.query(purpose ? { ...scope, purpose } : scope);
}

export function openTerminal(scope: TerminalScope, input: TerminalOpenInput) {
  return trpc.tasks.terminal.open.mutate({ ...scope, ...input });
}
