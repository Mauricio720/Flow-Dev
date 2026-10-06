"use client";

import { useEffect, useEffectEvent, useReducer, useState } from "react";
import { INITIAL_DICTATION, dictationReducer, isCapturing } from "../dictationState";
import { CaptureController, INCOMPLETE_REASON } from "./captureController";
import type { CaptureScope } from "./dictationApi";

const HIDDEN_STATE = "hidden";

export function useDictation(scope: CaptureScope, enabled: boolean) {
  const [state, dispatch] = useReducer(dictationReducer, INITIAL_DICTATION);
  const [controller] = useState(() => new CaptureController(dispatch));
  const interrupt = useEffectEvent(() => void controller.interrupt(INCOMPLETE_REASON));
  useEffect(() => {
    const onVisibility = () => document.visibilityState === HIDDEN_STATE && interrupt();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", interrupt);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", interrupt);
      controller.dispose();
    };
  }, [controller]);
  useEffect(() => {
    if (!enabled) interrupt();
  }, [enabled]);
  return {
    text: state.text,
    phase: state.phase,
    reason: state.reason,
    capturing: isCapturing(state.phase),
    available: enabled,
    setText: (text: string) => dispatch({ type: "typed", text }),
    clear: (sent: string) => dispatch({ type: "sent", text: sent }),
    start: () => void (enabled && controller.start(scope)),
    stop: () => void controller.stop(),
    cancel: () => controller.cancel(),
  };
}

export type AuthoringInput = ReturnType<typeof useDictation>;
