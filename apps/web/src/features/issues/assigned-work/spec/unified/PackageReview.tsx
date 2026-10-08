"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmPoints } from "./ConfirmPoints";
import { DocumentsSkeleton } from "./FlowSkeletons";
import { isApproved, latestPackage } from "./flowStages";
import { openPoints } from "./openPoints";
import { PackageDocumentView } from "./PackageDocumentView";
import { readPackage } from "./packageReader";
import { PACKAGE_FORMAT_LABELS, PACKAGE_STATUS_LABELS } from "./unifiedCopy";
import type { FlowPackage, FlowTarget } from "./unifiedContract";
import { usePackageDocuments } from "./usePackageDocuments";
import { usePointConfirmations } from "./usePointConfirmations";
import { WorkingIndicator } from "./WorkingIndicator";

type Props = { target: FlowTarget; packages: FlowPackage[]; generating: boolean; canAct: boolean; busy: boolean; onApprove: (input: { packageId: string; version: number }) => void };
const GENERATING_LABEL = "O agente está gerando os documentos. Eles aparecem aqui quando a execução terminar.";
const APPROVAL_NOTES: Record<string, string> = {
  os_spec_v1: "Aprovar confirma exatamente esta versão e libera a criação das tarefas, que continua sendo uma ação separada.",
  os_tasks_v1: "Aprovar confirma estas tarefas e libera a implementação por um Loop compatível.",
};

function optionLabel(item: FlowPackage) {
  const status = isApproved(item) ? PACKAGE_STATUS_LABELS.approved : PACKAGE_STATUS_LABELS[item.status] ?? item.status;
  return `${PACKAGE_FORMAT_LABELS[item.format] ?? item.format} v${item.version} · ${status}`;
}

function olderNote(selected: FlowPackage, packages: FlowPackage[]) {
  const newest = latestPackage(packages, selected.format);
  if (newest && newest.id !== selected.id) return `Versão anterior, somente leitura. A versão atual é a v${newest.version}.`;
  return isApproved(selected) ? "Versão aprovada, somente leitura. Ela é a base da etapa seguinte." : null;
}

export function PackageReview({ target, packages, generating, canAct, busy, onApprove }: Props) {
  const latest = packages[0] ?? null;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = packages.find((item) => item.id === pickedId) ?? latest;
  const { documents, failed, loading } = usePackageDocuments(target, selected?.id ?? null);
  const tabs = useMemo(() => (documents ? readPackage(documents) : []), [documents]);
  const points = useMemo(() => openPoints(tabs.flatMap((tab) => tab.documents)), [tabs]);
  const { confirmed, toggle } = usePointConfirmations(selected?.id ?? null);
  if ((!latest || !selected) && generating) return <div className="space-y-3"><WorkingIndicator label={GENERATING_LABEL} /><DocumentsSkeleton /></div>;
  if (!latest || !selected) return <p className="text-sm text-ink-2">Nenhum documento foi gerado ainda.</p>;
  const approvable = canAct && selected.id === latest.id && selected.status === "review_ready";
  const missing = points.filter((point) => !confirmed.has(point.id)).length;
  const note = selected.id === latest.id && !isApproved(selected) ? null : olderNote(selected, packages);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label htmlFor="package-version" className="text-sm font-medium">Versão</label>
        <select id="package-version" className="h-9 rounded-md border border-input bg-surface px-2 text-sm" value={selected.id} onChange={(event) => setPickedId(event.target.value)}>
          {packages.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
        </select>
        {note && <p role="status" className="text-sm text-ink-3">{note}</p>}
      </div>
      {loading && <DocumentsSkeleton />}
      {failed && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os documentos desta versão.</p>}
      {documents && approvable && <ConfirmPoints points={points} confirmed={confirmed} disabled={busy} onToggle={toggle} />}
      {documents && <div className="row-strike"><PackageDocumentView key={documents.id} tabs={tabs} /></div>}
      {approvable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3">
          <p className="max-w-[48ch] text-sm leading-6 text-ink-2">{missing > 0 ? `Faltam ${missing} de ${points.length} pontos para confirmar acima. A aprovação libera depois disso.` : APPROVAL_NOTES[selected.format]}</p>
          <Button type="button" variant="publish" disabled={busy || missing > 0 || !documents} onClick={() => onApprove({ packageId: selected.id, version: selected.version })}>Aprovar versão {selected.version}</Button>
        </div>
      )}
    </div>
  );
}
