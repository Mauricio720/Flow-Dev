"use client";

import { useState } from "react";
import { GitHubMark } from "@/components/icons";
import { authClient } from "@/lib/auth/client";

export function GitHubSignIn() {
  const [pending, setPending] = useState(false);

  function signIn() {
    setPending(true);
    void authClient.signIn.social({ provider: "github", callbackURL: "/" }).catch(() => setPending(false));
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      aria-busy={pending}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-ink px-5 text-[15px] font-medium text-ground shadow-raised transition-[background-color,transform] duration-200 ease-out-expo hover:bg-ink/90 active:translate-y-px disabled:cursor-progress disabled:bg-ink/80"
    >
      {pending ? (
        <span className="node-running size-2.5 rounded-full bg-merge" aria-hidden="true" />
      ) : (
        <GitHubMark size={18} />
      )}
      {pending ? "Abrindo o GitHub…" : "Continuar com GitHub"}
    </button>
  );
}
