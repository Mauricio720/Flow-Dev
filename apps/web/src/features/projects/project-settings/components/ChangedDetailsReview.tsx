import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/contract";

type Props = { changed: Project; onReview: (keepMine: boolean) => void };

export function ChangedDetailsReview({ changed, onReview }: Props) {
  return (
    <div role="alert" aria-labelledby="changed-details-title" className="rounded-xl border border-clarify/40 bg-clarify-wash px-5 py-5">
      <h3 id="changed-details-title" className="text-[15px] font-semibold text-clarify-ink">Os detalhes mudaram enquanto você editava</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">Nada do que você digitou foi salvo. Estes são os dados atuais; revise antes de enviar de novo.</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-ink-3">Nome atual</dt>
        <dd className="[overflow-wrap:anywhere]">{changed.name}</dd>
        <dt className="text-ink-3">Descrição atual</dt>
        <dd className="[overflow-wrap:anywhere]">{changed.description ?? "Sem descrição"}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => onReview(false)}>Usar os dados atuais</Button>
        <Button type="button" variant="outline" onClick={() => onReview(true)}>Manter minhas alterações</Button>
      </div>
    </div>
  );
}
