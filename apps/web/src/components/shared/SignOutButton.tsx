"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { clearAllSpecPending } from "@/features/issues/assigned-work/spec/specPendingStore";
import { authClient } from "@/lib/auth/client";

const LOGIN_PATH = "/login";

export function SignOutButton() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  async function signOut() {
    clearAllSpecPending();
    const result = await authClient.signOut();
    if (result.error) return setFailed(true);
    router.push(LOGIN_PATH);
  }
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sair">
        <LogOutIcon />
        <span className="hidden sm:inline">Sair</span>
      </Button>
      {failed && <p role="alert" className="absolute top-12 right-3 z-10 rounded-md border border-github/40 bg-github-wash px-3 py-2 text-sm text-github-ink">Não foi possível sair. Tente novamente.</p>}
    </>
  );
}
