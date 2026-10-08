"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectionRow } from "../contract";

type Props = { row: ConnectionRow; onSubmit: (label: string) => void };

export function RenameForm({ row, onSubmit }: Props) {
  const [label, setLabel] = useState(row.label);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(label);
  };
  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="rename-connection">Novo nome para {row.label}</Label>
        <Input id="rename-connection" value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>
      <Button type="submit">Salvar nome</Button>
    </form>
  );
}
