import { isActiveSession, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export const UNCONFIRMED_AFTER_MS = 60_000;
export const SILENT_AFTER_MS = 1_800_000;

export function silentSince(input: { status: TerminalSessionStatus; lastSignalAt: Date; now: Date }): Date | null {
  if (!isActiveSession(input.status)) return null;
  const silentMs = input.now.getTime() - input.lastSignalAt.getTime();
  return silentMs >= SILENT_AFTER_MS ? input.lastSignalAt : null;
}
