"use client";

import { CompozyBindingSummary } from "./CompozyBindingSummary";
import { CompozyHealthLine } from "./CompozyHealthLine";
import { NOT_CONFIGURED } from "./compozyCopy";
import { CompozyPendingLoad, CompozySection } from "./CompozySection";
import { useCompozyBinding } from "./useCompozyBinding";

type Props = { projectId: string; repository: string };

export function CompozyBindingReadOnly({ projectId, repository }: Props) {
  const { load } = useCompozyBinding(projectId);
  if (load.kind !== "loaded") return <CompozySection><CompozyPendingLoad load={load} /></CompozySection>;
  const { binding, compozy } = load.view;
  return (
    <CompozySection>
      {binding ? <CompozyBindingSummary binding={binding} repository={repository} /> : <p className="rounded-xl border border-line bg-surface px-5 py-4 text-sm leading-6 text-ink-2">{NOT_CONFIGURED}</p>}
      <CompozyHealthLine compozy={compozy} />
      <p className="text-sm text-ink-3">Somente administradores vinculam a pasta local do repositório.</p>
    </CompozySection>
  );
}
