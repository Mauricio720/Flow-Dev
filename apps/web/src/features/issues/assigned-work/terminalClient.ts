import { trpc } from "@/lib/trpc/client";
import type { TerminalOpenInput, TerminalScope } from "./terminalContract";

export function fetchTerminalPreflight(scope: TerminalScope) {
  return trpc.tasks.terminal.preflight.query(scope);
}

export function openTerminal(scope: TerminalScope, input: TerminalOpenInput) {
  return trpc.tasks.terminal.open.mutate({ ...scope, ...input });
}
