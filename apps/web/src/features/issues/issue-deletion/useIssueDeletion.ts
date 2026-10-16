"use client";

import { useEffect, useState } from "react";
import { trpcCode, trpcData } from "@/lib/trpc/error";
import { trpc } from "@/lib/trpc/client";
import type { DeletionPreview, DeletionStatus, DeletionTarget } from "./types";
import { deletionErrorCopy } from "./copy";

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 1_000;
const wait = () => new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

function reasonFrom(error: unknown) {
  const data = trpcData(error);
  return data && "reason" in data && typeof data.reason === "string" ? data.reason : null;
}

function codeFrom(error: unknown) {
  const code = trpcCode(error);
  return typeof code === "string" ? code : null;
}

export function useIssueDeletion(target: DeletionTarget, onComplete: () => void) {
  const targetKey = JSON.stringify(target);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const previewQuery = trpc.issueDeletion?.preview?.query;

  useEffect(() => {
    let active = true;
    if (!previewQuery) return () => { active = false; };
    const currentTarget = JSON.parse(targetKey) as DeletionTarget;
    void previewQuery(currentTarget).then((value) => {
      if (active) setPreview(value);
    }).catch((error: unknown) => {
      if (active) setFailure(deletionErrorCopy(codeFrom(error), reasonFrom(error)));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [targetKey, previewQuery]);

  async function poll(operationId: string, initial: DeletionStatus) {
    let current = initial;
    setStatus(current);
    for (let attempt = 0; attempt < MAX_POLLS && isProcessing(current); attempt += 1) {
      await wait();
      current = await trpc.issueDeletion.status.query({ operationId });
      setStatus(current);
    }
    if (current.state === "completed") onComplete();
  }

  async function perform(action: () => Promise<DeletionStatus>) {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await pollFrom(action);
    } catch (error) {
      setFailure(deletionErrorCopy(codeFrom(error), reasonFrom(error)));
    } finally {
      setBusy(false);
    }
  }

  async function pollFrom(action: () => Promise<DeletionStatus>) {
    const initial = await action();
    await poll(initial.operationId, initial);
  }

  function start() {
    if (!preview?.canDelete || !preview.fingerprint) return Promise.resolve();
    return perform(() => trpc.issueDeletion.start.mutate({ target, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() }));
  }

  function retry() {
    if (!status) return Promise.resolve();
    return perform(() => trpc.issueDeletion.retry.mutate({ operationId: status.operationId, requestKey: crypto.randomUUID() }));
  }

  async function refreshStatus() {
    if (!status || busy) return;
    setBusy(true);
    try {
      const current = await trpc.issueDeletion.status.query({ operationId: status.operationId });
      await poll(current.operationId, current);
    } catch (error) {
      setFailure(deletionErrorCopy(codeFrom(error), reasonFrom(error)));
    } finally {
      setBusy(false);
    }
  }

  return { preview, loading, failure, status, busy, start, retry, refreshStatus };
}

function isProcessing(status: DeletionStatus) {
  return status.state !== "completed" && status.state !== "recoverable";
}
