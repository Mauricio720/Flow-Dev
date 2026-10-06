"use client";

import { useState } from "react";
import { GitHubMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function GitHubSignIn({ destination = "/projects" }: { destination?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function signIn() {
    setPending(true);
    setError(null);
    void authClient.signIn.social({ provider: "github", callbackURL: destination, errorCallbackURL: "/login?next=" + encodeURIComponent(destination) }).then((result) => {
      if (result.error) {
        setPending(false);
        setError(result.error.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente." : "Não foi possível iniciar o acesso ao GitHub. Tente novamente.");
      }
    }).catch(() => {
      setPending(false);
      setError("Não foi possível iniciar o acesso ao GitHub. Tente novamente.");
    });
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        onClick={signIn}
        disabled={pending}
        aria-busy={pending}
        className="w-full gap-3 shadow-raised disabled:cursor-progress disabled:bg-primary/80 disabled:opacity-100"
      >
        {pending ? <span className="node-running size-2.5 rounded-full bg-merge" aria-hidden="true" /> : <GitHubMark size={18} />}
        {pending ? "Abrindo o GitHub…" : "Continuar com GitHub"}
      </Button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
