"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

export function SessionRefresh() {
  useEffect(() => {
    void authClient.getSession();
  }, []);
  return null;
}
