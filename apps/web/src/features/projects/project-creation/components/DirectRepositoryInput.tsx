"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRepositoryReference } from "../repositoryReference";

const FIELD_ID = "repository-reference";

type Props = { onPreview: (owner: string, name: string) => void };

export function DirectRepositoryInput({ onPreview }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const reference = parseRepositoryReference(value);
    setError(reference.ok ? null : reference.error);
    if (reference.ok) onPreview(reference.owner, reference.name);
  }
  return (
    <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-2">
      <Label htmlFor={FIELD_ID} className="text-ink-3">Não achou na lista? Informe owner/nome</Label>
      <div className="flex flex-wrap gap-2">
        <Input id={FIELD_ID} value={value} autoComplete="off" placeholder="acme/loja-web" aria-invalid={!!error} aria-describedby={error ? `${FIELD_ID}-error` : undefined} className="max-w-sm flex-1 font-mono text-[13px]" onChange={(event) => setValue(event.target.value)} />
        <Button type="submit" variant="outline">Verificar repositório</Button>
      </div>
      {error && <p id={`${FIELD_ID}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
