"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { ConnectionRow } from "../contract";
import { FAILURE_MESSAGES, GENERIC_FAILURE } from "../copy";
import { useAccessGuard } from "./useAccessGuard";

export function useConnectionActions(onChanged: () => void) {
  const guard = useAccessGuard();
  const [message, setMessage] = useState<string | null>(null);

  async function run(operation: () => Promise<unknown>, success: string) {
    try {
      await operation();
      setMessage(success);
    } catch (error) {
      const failure = guard(error);
      setMessage(FAILURE_MESSAGES[failure.reason ?? ""] ?? GENERIC_FAILURE);
    }
    onChanged();
  }

  const rename = (row: ConnectionRow, label: string) =>
    run(() => trpc.software.compozy.renameConnection.mutate({ connectionId: row.id, label, expectedRevision: row.revision }), "Conexão renomeada.");

  const disconnect = (row: ConnectionRow) =>
    run(() => trpc.software.compozy.disconnect.mutate({ connectionId: row.id, expectedRevision: row.revision, idempotencyKey: crypto.randomUUID() }), "Conexão desconectada. O histórico das execuções foi preservado.");

  return { message, rename, disconnect };
}
