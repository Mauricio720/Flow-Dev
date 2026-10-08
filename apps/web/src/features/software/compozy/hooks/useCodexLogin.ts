"use client";

import { useReducer } from "react";
import { trpc } from "@/lib/trpc/client";
import { FAILURE_MESSAGES, GENERIC_FAILURE } from "../copy";
import type { LoginProvider } from "../contract";
import { loginReducer, type LoginUi } from "./loginState";
import { useAccessGuard } from "./useAccessGuard";
import { useLoginPolling } from "./useLoginPolling";

export type LoginTarget = { connectionId: string } | { label: string };

const SETUP_REQUIRED_MESSAGE = "A conexão com Claude exige ajuda do host: não há como concluir o login supervisionado com segurança neste ambiente. Nada foi conectado.";

export function useCodexLogin(onFinished: () => void) {
  const guard = useAccessGuard();
  const [state, dispatch] = useReducer(loginReducer, { phase: "idle" } as LoginUi);
  useLoginPolling(state, dispatch);

  const fail = (error: unknown) => {
    const failure = guard(error);
    dispatch({ type: "failed", message: FAILURE_MESSAGES[failure.reason ?? ""] ?? GENERIC_FAILURE });
  };

  async function begin(target: LoginTarget, provider: LoginProvider = "codex") {
    dispatch({ type: "starting", provider });
    try {
      const input = { ...target, idempotencyKey: crypto.randomUUID() };
      const result = await (provider === "codex" ? trpc.software.compozy.beginCodexLogin.mutate(input) : trpc.software.compozy.beginClaudeLogin.mutate(input));
      if (result.state === "setup_required") return dispatch({ type: "failed", message: SETUP_REQUIRED_MESSAGE });
      dispatch({ type: "started", start: result });
    } catch (error) { fail(error); }
  }

  async function confirm() {
    if (state.phase !== "confirm") return;
    const { start } = state;
    dispatch({ type: "confirming" });
    try {
      const result = await trpc.software.compozy.confirmAccount.mutate({ operationId: start.operationId, expectedConnectionRevision: start.connectionRevision });
      dispatch({ type: "connected", identityLabel: result.identityLabel });
    } catch (error) { fail(error); }
  }

  function close() {
    dispatch({ type: "reset" });
    onFinished();
  }

  return { state, begin, confirm, close };
}
