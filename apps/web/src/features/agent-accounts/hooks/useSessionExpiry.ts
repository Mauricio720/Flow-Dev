"use client";

import { useRouter } from "next/navigation";
import { AI_ACCOUNTS_PATH } from "@/lib/navigation/accountRoutes";
import { expiredSessionPath } from "@/lib/navigation/projectRoutes";

export function useSessionExpiry() {
  const router = useRouter();
  return () => router.replace(expiredSessionPath(AI_ACCOUNTS_PATH));
}
