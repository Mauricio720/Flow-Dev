"use client";

import { useState } from "react";
import { GitHubMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function GitHubSignIn() {
  const [pending, setPending] = useState(false);

  function signIn() {
    setPending(true);
    void authClient.signIn.social({ provider: "github", callbackURL: "/" }).catch(() => setPending(false));
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={signIn}
      disabled={pending}
      aria-busy={pending}
      className="w-full gap-3 shadow-raised disabled:cursor-progress disabled:bg-primary/80 disabled:opacity-100"
    >
      {pending ? (
        <span className="node-running size-2.5 rounded-full bg-merge" aria-hidden="true" />
      ) : (
        <GitHubMark size={18} />
      )}
      {pending ? "Abrindo o GitHub…" : "Continuar com GitHub"}
    </Button>
  );
}
