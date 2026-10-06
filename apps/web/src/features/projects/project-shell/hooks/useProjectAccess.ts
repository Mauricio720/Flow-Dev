"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnectionStates } from "@/hooks/useConnectionStates";
import { expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_BAD_REQUEST, TRPC_NOT_FOUND, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";

const LOST_ACCESS_CODES: unknown[] = [TRPC_NOT_FOUND, TRPC_BAD_REQUEST];

export function useProjectAccess(projectId: string, returnPath: string) {
  const router = useRouter();
  const [revokedId, setRevokedId] = useState<string | null>(null);
  const connections = useConnectionStates([projectId], (code) => {
    if (code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(returnPath));
    if (LOST_ACCESS_CODES.includes(code)) setRevokedId(projectId);
  });
  return { revoked: revokedId === projectId, kind: connections.kindOf(projectId), recheck: () => connections.recheck(projectId) };
}
