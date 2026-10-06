"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ConnectionKind, ConnectionState } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { trpc } from "@/lib/trpc/client";

const BATCH_SIZE = 50;
const ID_SEPARATOR = ",";
type Kinds = Record<string, ConnectionKind>;

function kindsFrom(states: ConnectionState[]): Kinds {
  return Object.fromEntries(states.map((state) => [state.projectId, state.kind]));
}

function sameKind(projectIds: string[], kind: ConnectionKind): Kinds {
  return Object.fromEntries(projectIds.map((projectId) => [projectId, kind]));
}

function batches(projectIds: string[]) {
  const count = Math.ceil(projectIds.length / BATCH_SIZE);
  return Array.from({ length: count }, (_, index) => projectIds.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
}

export function useConnectionStates(projectIds: string[], onFailure: (code: unknown) => void) {
  const [kinds, setKinds] = useState<Kinds>({});
  const requested = useRef(new Set<string>());
  async function check(ids: string[]) {
    try {
      const states = await trpc.projects.connectionStates.query({ projectIds: ids });
      setKinds((current) => ({ ...current, ...kindsFrom(states) }));
    } catch (error) {
      setKinds((current) => ({ ...current, ...sameKind(ids, "unverified") }));
      onFailure(trpcCode(error));
    }
  }
  const checkPending = useEffectEvent((ids: string[]) => {
    const pending = ids.filter((id) => !requested.current.has(id));
    pending.forEach((id) => requested.current.add(id));
    batches(pending).forEach((batch) => void check(batch));
  });
  const key = projectIds.join(ID_SEPARATOR);
  useEffect(() => {
    if (key) checkPending(key.split(ID_SEPARATOR));
  }, [key]);
  function recheck(projectId: string) {
    setKinds((current) => ({ ...current, [projectId]: "checking" }));
    void check([projectId]);
  }
  return { kindOf: (projectId: string): ConnectionKind => kinds[projectId] ?? "checking", recheck };
}
