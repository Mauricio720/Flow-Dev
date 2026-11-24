"use client";

import { useRef, useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import { openTerminal } from "../terminalClient";
import type { OpenPurpose, PermissionMode, TerminalExtra, TerminalOpened, TerminalScope } from "../terminalContract";
import { OPEN_FAILED_MESSAGE } from "../terminalCopy";
import type { LaunchPreflight } from "./useLaunchPreflight";

export const NO_EXTRA: TerminalExtra = { attachmentIds: [], issueImageIds: [] };
const SESSION_ACTIVE_REASON = "session_already_active";

function isSessionActive(error: unknown) {
  const data = trpcData(error);
  return Boolean(data && "reason" in data && data.reason === SESSION_ACTIVE_REASON);
}

function failureMessage(error: unknown) {
  const hasReason = Boolean(trpcData(error) && "reason" in trpcData(error)!);
  return error instanceof Error && hasReason ? error.message : OPEN_FAILED_MESSAGE;
}

type SenderOptions = { permissionMode: PermissionMode; purpose: OpenPurpose | undefined };

export function useTerminalSender(scope: TerminalScope, load: LaunchPreflight, options: SenderOptions) {
  const [failure, setFailure] = useState<string | null>(null);
  const [opened, setOpened] = useState<TerminalOpened | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const lastExtra = useRef<TerminalExtra>(NO_EXTRA);
  const sending = useRef(false);
  async function send(extra: TerminalExtra, allowAdditional: boolean): Promise<TerminalOpened | null> {
    if (sending.current || !load.preflight) return null;
    sending.current = true;
    lastExtra.current = extra;
    load.setPhase("sending");
    setFailure(null);
    setNeedsConfirmation(false);
    try {
      const { permissionMode, purpose } = options;
      const result = await openTerminal(scope, { prompt: load.prompt, requestKey: requestKey.current, allowAdditional, permissionMode, ...(purpose ? { purpose } : {}), ...extra });
      setOpened(result);
      load.setPhase("opened");
      return result;
    } catch (error) {
      if (isSessionActive(error)) setNeedsConfirmation(true);
      else setFailure(failureMessage(error));
      load.setPhase("ready");
      return null;
    } finally {
      sending.current = false;
    }
  }
  return { send, lastExtra, failure, opened, needsConfirmation, setNeedsConfirmation };
}
