"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginProvider } from "../contract";

type Props = { onBegin: (label: string, provider: LoginProvider) => void };

export function NewConnectionForm({ onBegin }: Props) {
  const [label, setLabel] = useState("");
  const begin = (provider: LoginProvider) => (event: FormEvent) => {
    event.preventDefault();
    onBegin(label, provider);
    setLabel("");
  };
  return (
    <form onSubmit={begin("codex")} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="new-connection">Nome da nova conexão</Label>
        <Input id="new-connection" value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>
      <Button type="submit" disabled={!label.trim()}>Adicionar Codex</Button>
      <Button type="button" variant="outline" disabled={!label.trim()} onClick={begin("claude")}>Adicionar Claude</Button>
    </form>
  );
}
