"use client";

import { useCallback, useEffect, useState } from "react";
import { TRPC_CONFLICT } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { CHOICE_FAILED_MESSAGE, STALE_CHOICE_MESSAGE, accountSelectId } from "../workAccountsCopy";
import type { WorkAccountProvider, WorkAccounts } from "../workAccountsContract";

function choiceFailure(error: unknown) {
  if (trpcCode(error) === TRPC_CONFLICT) return STALE_CHOICE_MESSAGE;
  return error instanceof Error && trpcCode(error) ? error.message : CHOICE_FAILED_MESSAGE;
}

function jumpTo(provider: WorkAccountProvider) {
  const select = document.getElementById(accountSelectId(provider));
  select?.scrollIntoView?.({ block: "center" });
  select?.focus();
}

export function useWorkAccounts(taskId: string, enabled: boolean) {
  const [data, setData] = useState<WorkAccounts | null>(null);
  const [saving, setSaving] = useState<WorkAccountProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const read = useCallback(async () => {
    try { return await trpc.tasks.workAccounts.get.query({ taskId }); } catch { return null; }
  }, [taskId]);
  const reload = useCallback(async () => setData(await read()), [read]);
  useEffect(() => {
    if (enabled) void read().then((fresh) => setData(fresh ?? null));
  }, [enabled, read]);
  async function choose(provider: WorkAccountProvider, accountId: string | null) {
    if (!data || saving) return;
    setSaving(provider);
    setMessage(null);
    await trpc.tasks.workAccounts.set.mutate({ taskId, provider, accountId, version: data.version }).catch((error: unknown) => setMessage(choiceFailure(error)));
    await reload();
    setSaving(null);
  }
  const choiceOf = (provider: WorkAccountProvider) => data?.choices.find((choice) => choice.provider === provider) ?? null;
  return { data, saving, message, choose, choiceOf, jumpTo };
}

export type WorkAccountsState = ReturnType<typeof useWorkAccounts>;
