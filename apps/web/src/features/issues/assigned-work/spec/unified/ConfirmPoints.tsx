"use client";

import type { OpenPoint } from "./openPoints";
import { PackageMarkdownBlocks } from "./PackageMarkdownBlock";

type Props = { points: OpenPoint[]; confirmed: ReadonlySet<string>; disabled: boolean; onToggle: (id: string) => void };
const POINT_LABEL = "Pergunta em aberto";

function groupByDocument(points: OpenPoint[]) {
  const groups = new Map<string, OpenPoint[]>();
  for (const point of points) groups.set(point.documentLabel, [...(groups.get(point.documentLabel) ?? []), point]);
  return [...groups.entries()];
}

type RowProps = { point: OpenPoint; checked: boolean; disabled: boolean; onToggle: (id: string) => void };

function PointRow({ point, checked, disabled, onToggle }: RowProps) {
  const detailId = point.detail.length > 0 ? `${point.id}:detail` : undefined;
  return (
    <div className="space-y-2 rounded-md bg-raised px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-project">
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
        <input type="checkbox" checked={checked} disabled={disabled} aria-describedby={detailId} onChange={() => onToggle(point.id)} className="mt-1 size-4 shrink-0 accent-ink" />
        <span><span className="block text-xs font-medium text-clarify-ink">{POINT_LABEL}</span><span className={detailId ? "font-semibold" : undefined}>{point.text}</span></span>
      </label>
      {detailId && <div id={detailId} className="space-y-2 pl-7"><PackageMarkdownBlocks tokens={point.detail} /></div>}
    </div>
  );
}

export function ConfirmPoints({ points, confirmed, disabled, onToggle }: Props) {
  if (points.length === 0) return null;
  const done = points.filter((point) => confirmed.has(point.id)).length;
  return (
    <section aria-label="Pontos para confirmar" className="space-y-4 rounded-lg border-2 border-clarify bg-clarify-wash p-4">
      <div className="space-y-1">
        <h4 className="text-[15px] font-semibold text-ink">Confirme antes de aprovar</h4>
        <p className="max-w-[62ch] text-sm leading-6 text-ink-2">O agente fechou esta versão com perguntas em aberto. Marque cada uma que você leu e aceita deixar assim. Se alguma precisar de resposta antes, não aprove esta versão.</p>
      </div>
      {groupByDocument(points).map(([label, items]) => (
        <fieldset key={label} className="space-y-2">
          <legend className="text-sm font-semibold text-ink">{label}</legend>
          {items.map((point) => <PointRow key={point.id} point={point} checked={confirmed.has(point.id)} disabled={disabled} onToggle={onToggle} />)}
        </fieldset>
      ))}
      <p role="status" className="text-sm font-medium text-ink tabular-nums">{done} de {points.length} confirmados</p>
    </section>
  );
}
