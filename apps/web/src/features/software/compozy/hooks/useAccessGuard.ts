"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PROJECTS_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_FORBIDDEN, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { SOFTWARE_COMPOZY_PATH } from "../paths";
import { readFailure, type SoftwareFailure } from "./softwareFailure";

export function useAccessGuard() {
  const router = useRouter();
  return useCallback((error: unknown): SoftwareFailure => {
    const failure = readFailure(error);
    if (failure.code === TRPC_UNAUTHORIZED) router.replace(expiredSessionPath(SOFTWARE_COMPOZY_PATH));
    if (failure.code === TRPC_FORBIDDEN) router.replace(PROJECTS_PATH);
    return failure;
  }, [router]);
}
