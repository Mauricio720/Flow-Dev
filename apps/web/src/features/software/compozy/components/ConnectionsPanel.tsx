"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConnectionRow, LoginProvider } from "../contract";
import type { LoginTarget } from "../hooks/useCodexLogin";
import { useConnectionActions } from "../hooks/useConnectionActions";
import { ConnectionRowView } from "./ConnectionRowView";
import { NewConnectionForm } from "./NewConnectionForm";
import { RenameForm } from "./RenameForm";

type Props = {
  items: ConnectionRow[];
  hasMore: boolean;
  failed: boolean;
  onLoadMore: () => void;
  onChanged: () => void;
  onBegin: (target: LoginTarget, provider: LoginProvider) => void;
};

const EMPTY_TEXT = "Nenhuma conexão ainda. Adicione uma conta Codex ou Claude: nenhum modelo é escolhido por padrão.";

export function ConnectionsPanel({ items, hasMore, failed, onLoadMore, onChanged, onBegin }: Props) {
  const actions = useConnectionActions(onChanged);
  const [renaming, setRenaming] = useState<ConnectionRow | null>(null);

  const submitRename = (label: string) => {
    if (renaming) void actions.rename(renaming, label);
    setRenaming(null);
  };

  return (
    <section aria-labelledby="connections-title" className="mt-10">
      <h2 id="connections-title" className="text-xl font-semibold tracking-[-0.02em]">Conexões</h2>
      <NewConnectionForm onBegin={(label, provider) => onBegin({ label }, provider)} />
      {renaming && <RenameForm key={renaming.id} row={renaming} onSubmit={submitRename} />}
      {actions.message && <p role="status" className="mt-3 text-sm text-ink-2">{actions.message}</p>}
      {failed && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível atualizar as conexões.</p>}
      {items.length === 0 ? <p className="mt-4 text-sm text-ink-2">{EMPTY_TEXT}</p> : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-raised">
          {items.map((row) => <ConnectionRowView key={row.id} row={row} onReconnect={(target) => onBegin({ connectionId: target.id }, target.providerKind)} onRename={setRenaming} onDisconnect={(target) => void actions.disconnect(target)} />)}
        </ul>
      )}
      {hasMore && <Button type="button" variant="outline" className="mt-4" onClick={onLoadMore}>Carregar mais conexões</Button>}
    </section>
  );
}
